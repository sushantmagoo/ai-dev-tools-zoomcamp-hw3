# AWS deployment (CloudFormation + EC2)

`ec2-stack.yaml` provisions a single EC2 instance that clones this repo and
runs its production `docker-compose.yml` (Postgres + the backend, which
serves the built frontend on port 8000) — the same stack `make docker-up`
runs locally, just on AWS.

`github-oidc-role.yaml` provisions the IAM role the CI/CD pipeline assumes
(via GitHub's OIDC provider, no stored AWS keys) to redeploy new code to
that instance on every push to `master` — see
[`../../_docs/deployment.md`](../../_docs/deployment.md) for how the two fit
together and [`../../_docs/release-process.md`](../../_docs/release-process.md)
for the day-to-day process. This file is the quick command reference for
both templates.

## What it creates

- A security group allowing inbound SSH (22, from a CIDR you choose) and
  the app port (8000, public) — Postgres (5432) is never exposed.
- One EC2 instance (Amazon Linux 2023, latest AMI resolved via SSM at
  deploy time) that installs Docker + the Compose plugin, clones the repo,
  and runs `docker compose up -d --build` via `UserData` on first boot.
- An Elastic IP, so the address stays the same across a stop/start.

It does **not** create a VPC/subnet (you supply an existing one — your
account's default VPC works) or set up HTTPS/a domain — see "Not covered"
below.

## Deploy the app instance

```bash
aws cloudformation deploy \
  --template-file infra/cloudformation/ec2-stack.yaml \
  --stack-name expense-splitter \
  --parameter-overrides \
      VpcId=vpc-xxxxxxxx \
      SubnetId=subnet-xxxxxxxx \
      KeyPairName=your-key-pair \
      SSHLocationCidr=YOUR_IP/32 \
  --capabilities CAPABILITY_IAM
```

(`CAPABILITY_IAM` is required because the template creates an IAM role for
the instance — that's what lets the CI/CD pipeline redeploy it later via
SSM instead of SSH.)

Finding a `VpcId`/`SubnetId`: `aws ec2 describe-subnets --filters
Name=default-for-az,Values=true --query 'Subnets[0].[VpcId,SubnetId]'`
returns a default-VPC public subnet.

This returns once the *instance* exists (a minute or two) — it does not
wait for `UserData` to finish installing Docker and building the app
images, which takes a few minutes longer. Then:

```bash
aws cloudformation describe-stacks --stack-name expense-splitter \
  --query 'Stacks[0].Outputs'
```

`AppUrl` is what you open in a browser; `SSHCommand` is how you get on the
box to check `docker compose logs` if it's not up yet (or
`tail -f /var/log/user-data.log` for the boot script's own log).

## Deploy the CI/CD role (one-time, enables automated deploys)

```bash
aws cloudformation deploy \
  --template-file infra/cloudformation/github-oidc-role.yaml \
  --stack-name expense-splitter-github-oidc \
  --parameter-overrides \
      GitHubOrg=your-github-org-or-username \
      GitHubRepo=your-repo-name \
  --capabilities CAPABILITY_IAM
```

Add `CreateOidcProvider=false` if your AWS account already has a GitHub
OIDC provider registered (an account can only have one per URL). Then:

```bash
aws cloudformation describe-stacks --stack-name expense-splitter-github-oidc \
  --query 'Stacks[0].Outputs[0].OutputValue' --output text
```

Store that role ARN as a GitHub **environment** secret named
`AWS_DEPLOY_ROLE_ARN` on an environment named `production`
(**Settings → Environments**) — see
[`../../_docs/deployment.md`](../../_docs/deployment.md) for why an
environment secret specifically, and what the role can/can't do.

## Update / redeploy new code

`UserData` only runs on first boot, so a `git push` doesn't automatically
reach the instance — unless the CI/CD pipeline is set up (the previous
section), which does exactly this on every push to `master`. Manually, SSH
in and:

```bash
cd /opt/app && git pull && docker compose up -d --build
```

## Tear down

```bash
aws cloudformation delete-stack --stack-name expense-splitter
```

This deletes the instance, its EBS volume, the Elastic IP, and the
security group — and with them, the Postgres data (it lives in a Docker
volume on that instance's disk, not anywhere durable across instances).

If you also set up the CI/CD role, it has no ongoing cost but there's no
reason to leave an unused IAM role around:

```bash
aws cloudformation delete-stack --stack-name expense-splitter-github-oidc
```

## Not covered (documented limitations, not oversights)

- **No HTTPS / domain.** The app is served over plain HTTP on port 8000.
  Put a domain + ACM certificate + load balancer or reverse proxy in front
  of it for anything beyond a demo.
- **No backups.** Postgres data lives in a Docker volume on the instance's
  root EBS volume; terminating the instance loses it.
- **Single instance, no HA.** One EC2 instance running everything — no
  redundancy, no zero-downtime deploys.
- **Demo DB credentials.** `docker-compose.yml` still uses the same
  `ledger`/`ledger` credentials as local dev (matches this project's
  existing no-auth, practice-project scope — see `_docs/spec.md`). Rotate
  these (e.g. via Secrets Manager) before putting anything real behind
  this.
- **UserData doesn't self-heal past first boot** — see "Update /
  redeploy" above.

These are reasonable to accept for a practice deployment; they're exactly
where the effort would go next for a real one.
