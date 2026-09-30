# ADR-009 Hosting: single VPS for demo, AWS as reference architecture
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: VCK-804, NFR-12, A-05

## Context
Demo budget ≈ 25 USD/month; clients vary from small shops to companies expecting cloud-native setups.

## Options considered
1. AWS ECS Fargate + RDS + ElastiCache + S3/CloudFront — production-grade, costly for a demo.
2. One VPS (4 vCPU/8 GB) with Docker Compose/Caddy, object storage + CDN, WAL backups offsite.

## Decision
Option 2 for staging and demo; Option 1 documented in `infra/aws/` (Terraform reference, not deployed) for client pitches.

## Consequences
Single-host failure risk accepted for demo; restore drill proves RTO; load tests define VPS capacity (VCK-802).
