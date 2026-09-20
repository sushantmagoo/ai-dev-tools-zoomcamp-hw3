# AWS deployment (CloudFormation + EC2)

`ec2-stack.yaml` provisions a single EC2 instance that clones this repo and
runs its production `docker-compose.yml` (Postgres + the backend, which
serves the built frontend on port 8000) — the same stack `make docker-up`
runs locally, just on AWS.

See [`STEPS.md`](../../STEPS.md) for the full step-by-step walkthrough this
was designed against. This file is the quick reference.

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

## Deploy

```bash
aws cloudformation deploy \
  --template-file infra/cloudformation/ec2-stack.yaml \
  --stack-name expense-splitter \
  --parameter-overrides \
      VpcId=vpc-xxxxxxxx \
      SubnetId=subnet-xxxxxxxx \
      KeyPairName=your-key-pair \
      SSHLocationCidr=YOUR_IP/32
```

Finding a `VpcId`/`SubnetId`: `aws ec2 describe-subnets --filters
Name=default-for-az,Values=true --query 'Subnets[0].[VpcId,SubnetId]'`
returns a default-VPC public subnet.

Then, once the stack finishes (a few minutes for `UserData` to build the
images afterwards — see STEPS.md for how to watch that):

```bash
aws cloudformation describe-stacks --stack-name expense-splitter \
  --query 'Stacks[0].Outputs'
```

`AppUrl` is what you open in a browser; `SSHCommand` is how you get on the
box to check `docker compose logs` if it's not up yet.

## Update / redeploy new code

`UserData` only runs on first boot, so a `git push` doesn't automatically
reach the instance. SSH in and:

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
