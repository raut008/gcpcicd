# CI/CD Pipeline Setup Guide

## Product Requirements Document (PRD)

### Overview

This document explains how to set up a complete CI/CD pipeline for deploying a React application to Google Kubernetes Engine (GKE) using GitHub Actions, Docker, and Kustomize.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Docker Setup](#docker-setup)
5. [Kubernetes Manifests](#kubernetes-manifests)
6. [Load Balancer, Ingress & Networking](#load-balancer-ingress--networking)
7. [GitHub Actions Workflows](#github-actions-workflows)
8. [GCP Setup](#gcp-setup)
9. [Deployment Flow](#deployment-flow)
10. [Verification Steps](#verification-steps)

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Developer     │     │  GitHub Actions │     │      GCP        │
│   Push Code     │────▶│  Build & Deploy │────▶│  GKE Cluster    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │                        │
                              ▼                        ▼
                        ┌───────────┐           ┌───────────┐
                        │  Docker   │           │  Cloud    │
                        │  Image    │──────────▶│  CDN +    │
                        │  Registry │           │  SSL      │
                        └───────────┘           └───────────┘
```

**Flow:**

1. Developer pushes code to `main` branch
2. GitHub Actions **Build** workflow triggers
3. Docker image is built and pushed to Google Artifact Registry
4. GitHub Actions **Release** workflow triggers after successful build
5. Kubernetes manifests are applied to GKE cluster
6. Application is accessible via Cloud CDN with SSL

---

## Prerequisites

Before starting, ensure you have:

- [ ] Google Cloud Platform account
- [ ] GitHub repository
- [ ] GCP Project created
- [ ] GKE Cluster created
- [ ] Artifact Registry repository created
- [ ] Service Account with required permissions
- [ ] Custom domain (optional, for SSL)

### Required GCP APIs

Enable the following APIs in your GCP project:

```bash
gcloud services enable container.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable compute.googleapis.com
```

### Service Account Permissions

Create a service account with these roles:

- `roles/container.developer` (GKE access)
- `roles/artifactregistry.writer` (Push Docker images)
- `roles/compute.admin` (Load Balancer/Ingress)

---

## Project Structure

```
counter-app-master/
├── .github/
│   └── workflows/
│       ├── build.yml          # CI: Build & Push Docker image
│       └── release.yml        # CD: Deploy to GKE
├── kustomize/
│   ├── base/                  # Base Kubernetes manifests
│   │   ├── kustomization.yaml
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── dev/                   # Dev environment overlay
│   │   └── kustomization.yaml
│   ├── qa/                    # QA environment overlay
│   │   └── kustomization.yaml
│   └── prod/                  # Production environment overlay
│       ├── kustomization.yaml
│       ├── ingress.yaml
│       ├── managed-cert.yaml
│       └── backend-config.yaml
├── nginx/
│   └── default.conf           # Nginx configuration with caching
├── Dockerfile                 # Multi-stage Docker build
├── package.json
└── src/                       # Application source code
```

---

## Docker Setup

### Dockerfile Explained

```dockerfile
# Stage 1: Build the React application
FROM node:11.10.0 AS build
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files to Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Use custom Nginx config for caching
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Key Points:**

- Multi-stage build reduces final image size
- Stage 1: Node.js builds the React app
- Stage 2: Nginx serves the static files
- Custom nginx config enables caching and SPA routing

### Nginx Configuration

The `nginx/default.conf` file handles:

1. **Static Asset Caching:** JS, CSS, images cached for 1 year
2. **No Cache for index.html:** Ensures users get latest app version
3. **SPA Routing:** Redirects all routes to `index.html`
4. **Gzip Compression:** Reduces response sizes

---

## Kubernetes Manifests

### Base Manifests

#### Deployment (`kustomize/base/deployment.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gcp-cicd
spec:
  selector:
    matchLabels:
      app: gcp-cicd
  template:
    metadata:
      labels:
        app: gcp-cicd
    spec:
      containers:
        - name: gcp-cicd
          image: us-east1-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 80
```

**Key Points:**

- `imagePullPolicy: Always` ensures new images are pulled on each deployment
- `containerPort: 80` matches Nginx's listening port
- Labels are used for Service selector

#### Service (`kustomize/base/service.yaml`)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gcp-cicd
  annotations:
    beta.cloud.google.com/backend-config: '{"default": "gcp-cicd-backendconfig"}'
spec:
  selector:
    app: gcp-cicd
  ports:
    - port: 80
      targetPort: 80
```

**Key Points:**

- `backend-config` annotation links to BackendConfig for CDN
- `selector` matches deployment labels
- `port: 80` and `targetPort: 80` route traffic to Nginx

### Production Overlay

#### Kustomization (`kustomize/prod/kustomization.yaml`)

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
  - ../base
  - managed-cert.yaml
  - ingress.yaml
  - backend-config.yaml

images:
  - name: us-east1-docker.pkg.dev/PROJECT_ID/REPO/IMAGE
    newTag: latest
```

**Key Points:**

- Inherits from `base` manifests
- Adds production-specific resources (Ingress, SSL, CDN)
- Sets namespace to `production`

---

## Load Balancer, Ingress & Networking

This section explains how traffic flows from the internet to your application running in GKE.

### Traffic Flow Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           TRAFFIC FLOW                                        │
└──────────────────────────────────────────────────────────────────────────────┘

   USER (Browser)
        │
        │ HTTPS Request (https://gcpcicd.anand.theraut.com)
        ▼
┌───────────────────┐
│   DNS Resolution  │  ──▶ Returns Ingress IP (e.g., 34.54.197.98)
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Cloud CDN       │  ──▶ If cached, returns content immediately
│   (Edge Cache)    │      If not cached, forwards to Load Balancer
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Google Cloud    │  ──▶ SSL Termination (HTTPS → HTTP)
│   Load Balancer   │      Health checks, traffic distribution
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Ingress         │  ──▶ Routes traffic based on host/path rules
│   Controller      │      References ManagedCertificate for SSL
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Kubernetes      │  ──▶ Routes traffic to healthy pods
│   Service         │      Uses selector to find matching pods
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Pod (Nginx)     │  ──▶ Serves React app on port 80
│   containerPort:80│      Applies caching headers
└───────────────────┘
```

---

### What is a Load Balancer?

A **Load Balancer** distributes incoming network traffic across multiple servers (pods) to ensure:

- **High Availability:** If one pod fails, traffic goes to healthy pods
- **Scalability:** Handle more traffic by adding more pods
- **Performance:** Distribute load evenly

#### Types of Load Balancers in GKE

| Type              | Description                            | Use Case                      |
| ----------------- | -------------------------------------- | ----------------------------- |
| **External (L4)** | Layer 4 (TCP/UDP), exposes a public IP | Simple apps, non-HTTP traffic |
| **Internal (L4)** | Layer 4, private IP only               | Internal microservices        |
| **HTTP(S) (L7)**  | Layer 7, supports path/host routing    | Web apps with Ingress         |

#### How Load Balancer is Created

When you create a Kubernetes **Service** with `type: LoadBalancer`, GKE automatically:

1. Provisions a Google Cloud Load Balancer
2. Assigns an external IP address
3. Configures health checks
4. Routes traffic to your pods

```yaml
# Example: Service with LoadBalancer type
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: LoadBalancer # Creates external Load Balancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
```

---

### What is Ingress?

**Ingress** is a Kubernetes resource that manages external access to services, typically HTTP/HTTPS. It provides:

- **Host-based routing:** Route `app1.example.com` to Service A, `app2.example.com` to Service B
- **Path-based routing:** Route `/api` to API service, `/` to frontend service
- **SSL/TLS termination:** Handle HTTPS at the edge, forward HTTP internally
- **Single IP for multiple services:** One Load Balancer IP for multiple apps

#### Ingress vs Service (LoadBalancer)

| Feature    | Service (LoadBalancer)        | Ingress                          |
| ---------- | ----------------------------- | -------------------------------- |
| IP Address | One IP per service            | One IP for all services          |
| SSL/TLS    | Must configure in app         | Built-in with ManagedCertificate |
| Routing    | Port-based only               | Host and path-based              |
| Cost       | More expensive (multiple LBs) | Cost-effective (single LB)       |
| Layer      | L4 (TCP/UDP)                  | L7 (HTTP/HTTPS)                  |

#### Ingress Controller

An **Ingress Controller** is the component that actually implements the Ingress rules. In GKE, the default controller is **GCE Ingress Controller** which creates Google Cloud Load Balancers.

```yaml
# Our Ingress configuration
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gcpcicd-ingress
  annotations:
    kubernetes.io/ingress.class: "gce" # Use GCP's native ingress controller
    networking.gke.io/managed-certificates: gcpcicd-ssl # Link to SSL cert
spec:
  defaultBackend:
    service:
      name: gcp-cicd
      port:
        number: 80
  rules:
    - host: gcpcicd.anand.theraut.com # Route this domain
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: gcp-cicd
                port:
                  number: 80
```

**Annotations Explained:**

| Annotation                               | Purpose                            |
| ---------------------------------------- | ---------------------------------- |
| `kubernetes.io/ingress.class: "gce"`     | Use Google's native Load Balancer  |
| `networking.gke.io/managed-certificates` | Link to ManagedCertificate for SSL |

---

### SSL/TLS with ManagedCertificate

**ManagedCertificate** is a GKE-specific resource that automatically:

- Provisions SSL certificates from Google
- Handles certificate renewal
- Integrates with Ingress

```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: gcpcicd-ssl
spec:
  domains:
    - gcpcicd.anand.theraut.com # Your custom domain
```

**How SSL Works:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SSL/TLS TERMINATION                          │
└─────────────────────────────────────────────────────────────────┘

   Browser                    Load Balancer              Pod (Nginx)
      │                            │                          │
      │ ───HTTPS (port 443)───▶    │                          │
      │    (Encrypted)             │                          │
      │                            │ ──HTTP (port 80)───▶     │
      │                            │   (Decrypted)            │
      │                            │                          │
      │ ◀───HTTPS Response───      │ ◀──HTTP Response──       │
      │                            │                          │

- SSL terminates at Load Balancer (managed by Ingress)
- Internal traffic is HTTP (port 80) - faster, no encryption overhead
- Your app (Nginx) only needs to handle HTTP
```

**Certificate Lifecycle:**

1. **Provisioning:** Create ManagedCertificate resource
2. **Verification:** Google verifies domain ownership via DNS
3. **Activation:** Certificate becomes active (10-30 minutes)
4. **Renewal:** Automatic renewal before expiry

**Check Certificate Status:**

```bash
kubectl get managedcertificate -n production
# STATUS should be "Active"
```

---

### Cloud CDN with BackendConfig

**BackendConfig** is a GKE-specific resource that configures additional features for your backend service, including Cloud CDN.

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: gcp-cicd-backendconfig
spec:
  cdn:
    enabled: true # Enable Cloud CDN
```

**How Cloud CDN Works:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLOUD CDN FLOW                             │
└─────────────────────────────────────────────────────────────────┘

First Request (Cache Miss):
   User ──▶ CDN Edge ──▶ Load Balancer ──▶ Pod (Nginx)
                │                              │
                │◀─────── Response ◀───────────│
                │
           Cache stored at edge

Second Request (Cache Hit):
   User ──▶ CDN Edge (cached response)
                │
                │ Response served immediately
                ▼
           No traffic to origin

Cache headers from Nginx control CDN behavior:
- Static files (js, css): Cached for 1 year
- index.html: Never cached (always fresh)
```

**Linking BackendConfig to Service:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gcp-cicd
  annotations:
    # This annotation links Service to BackendConfig
    beta.cloud.google.com/backend-config: '{"default": "gcp-cicd-backendconfig"}'
spec:
  selector:
    app: gcp-cicd
  ports:
    - port: 80
      targetPort: 80
```

---

### Complete Networking Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     COMPLETE GKE NETWORKING                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
│                                                                              │
│    User Request: https://gcpcicd.anand.theraut.com/static/js/main.js        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DNS RESOLUTION                                                              │
│  ─────────────────                                                           │
│  gcpcicd.anand.theraut.com  ──▶  A Record  ──▶  34.54.197.98 (Ingress IP)   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLOUD CDN (Edge Cache)                                                      │
│  ─────────────────────────                                                   │
│  ┌─────────────────┐                                                         │
│  │ Cache Key:      │   Cache Hit?                                            │
│  │ host + path     │   ──▶ YES: Return cached response (fast!)               │
│  │                 │   ──▶ NO: Forward to Load Balancer                      │
│  └─────────────────┘                                                         │
│                                                                              │
│  Respects Cache-Control headers from Nginx:                                  │
│  - "public, max-age=31536000, immutable" ──▶ Cache for 1 year                │
│  - "no-cache, no-store" ──▶ Always fetch from origin                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  GOOGLE CLOUD LOAD BALANCER (L7 HTTP/HTTPS)                                  │
│  ───────────────────────────────────────────                                 │
│  Created by: Ingress resource                                                │
│  Configured by: BackendConfig                                                │
│                                                                              │
│  Functions:                                                                  │
│  ├── SSL Termination (using ManagedCertificate)                              │
│  ├── Health Checks (ensures pods are healthy)                                │
│  ├── Traffic Distribution (round-robin to healthy pods)                      │
│  └── Cloud CDN Integration (via BackendConfig)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  INGRESS CONTROLLER                                                          │
│  ─────────────────────                                                       │
│  apiVersion: networking.k8s.io/v1                                            │
│  kind: Ingress                                                               │
│                                                                              │
│  Rules Applied:                                                              │
│  ├── Host: gcpcicd.anand.theraut.com                                         │
│  ├── Path: / (all paths)                                                     │
│  └── Backend: Service "gcp-cicd" on port 80                                  │
│                                                                              │
│  Annotations:                                                                │
│  ├── ingress.class: "gce" (use GCP Load Balancer)                            │
│  └── managed-certificates: gcpcicd-ssl (SSL cert reference)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  KUBERNETES SERVICE (ClusterIP)                                              │
│  ─────────────────────────────────                                           │
│  apiVersion: v1                                                              │
│  kind: Service                                                               │
│                                                                              │
│  Configuration:                                                              │
│  ├── Name: gcp-cicd                                                          │
│  ├── Port: 80 (external)                                                     │
│  ├── TargetPort: 80 (container)                                              │
│  ├── Selector: app=gcp-cicd (matches pod labels)                             │
│  └── Annotation: backend-config (links to CDN config)                        │
│                                                                              │
│  Service discovers pods using labels and routes traffic                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  KUBERNETES PODS (Running Nginx)                                             │
│  ─────────────────────────────────                                           │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                  │
│  │   Pod 1        │  │   Pod 2        │  │   Pod 3        │                  │
│  │   ──────       │  │   ──────       │  │   ──────       │                  │
│  │   Nginx:80     │  │   Nginx:80     │  │   Nginx:80     │                  │
│  │   Labels:      │  │   Labels:      │  │   Labels:      │                  │
│  │   app=gcp-cicd │  │   app=gcp-cicd │  │   app=gcp-cicd │                  │
│  └────────────────┘  └────────────────┘  └────────────────┘                  │
│                                                                              │
│  Each pod:                                                                   │
│  ├── Runs nginx:alpine container                                             │
│  ├── Serves React app from /usr/share/nginx/html                             │
│  ├── Applies Cache-Control headers                                           │
│  └── Handles SPA routing (try_files $uri /index.html)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Port Mapping Explained

Understanding how ports connect from user to container:

```
┌─────────────────────────────────────────────────────────────────┐
│                      PORT MAPPING                               │
└─────────────────────────────────────────────────────────────────┘

User Browser          Load Balancer        Service           Pod
    │                      │                  │               │
    │ ──── 443 (HTTPS) ──▶ │                  │               │
    │                      │ ──── 80 ───────▶ │               │
    │                      │   (HTTP after    │ ── 80 ──────▶ │
    │                      │   SSL termination)│ (targetPort)  │
    │                      │                  │               │
    │                      │                  │               │

Port 443: User connects via HTTPS (encrypted)
Port 80 (Service): Ingress forwards to Service port
Port 80 (targetPort): Service forwards to container port
Port 80 (containerPort): Nginx listens on this port
```

**Why all internal ports are 80?**

- SSL terminates at the Load Balancer
- Internal cluster traffic is HTTP (faster, no encryption overhead)
- Nginx is configured to listen on port 80
- All manifests align: Service port=80, targetPort=80, containerPort=80

---

### Key Takeaways

| Component              | What it does                                     | Created by            |
| ---------------------- | ------------------------------------------------ | --------------------- |
| **Load Balancer**      | Distributes traffic, health checks, SSL          | Ingress resource      |
| **Ingress**            | Routes traffic by host/path, references SSL cert | `ingress.yaml`        |
| **ManagedCertificate** | Automatic SSL certificate                        | `managed-cert.yaml`   |
| **BackendConfig**      | Configures CDN, timeouts, health checks          | `backend-config.yaml` |
| **Service**            | Routes traffic to pods, links to BackendConfig   | `service.yaml`        |
| **Deployment**         | Manages pod replicas                             | `deployment.yaml`     |

---

## GitHub Actions Workflows

### Build Workflow (CI)

**File:** `.github/workflows/build.yml`

**Trigger:** Push to `main` branch

**Steps:**

1. Checkout code
2. Authenticate to Google Cloud
3. Configure Docker for Artifact Registry
4. Build Docker image with two tags:
   - `$COMMIT_SHA-$RUN_NUMBER` (unique version)
   - `latest` (for deployment)
5. Push both image tags

```yaml
name: Build Docker Image (CI)

on:
  push:
    branches:
      - main

env:
  PROJECT_ID: your-project-id
  REGION: us-east1
  REPOSITORY: gcp-cicd
  IMAGE_NAME: gcp-cicd

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Configure Docker for Artifact Registry
        run: |
          gcloud auth configure-docker $REGION-docker.pkg.dev

      - name: Build Docker image
        run: |
          docker build \
            -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE_NAME:${{ github.sha }}-${{ github.run_number }} \
            -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE_NAME:latest .

      - name: Push Docker image
        run: |
          docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE_NAME:${{ github.sha }}-${{ github.run_number }}
          docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE_NAME:latest
```

### Release Workflow (CD)

**File:** `.github/workflows/release.yml`

**Trigger:** After successful Build workflow

**Steps:**

1. Checkout code
2. Authenticate to Google Cloud
3. Set up kubectl
4. Get GKE credentials
5. Install Kustomize
6. Create namespace if not exists
7. Deploy with Kustomize
8. Restart deployment to pull new image
9. Verify deployment status

```yaml
name: Release and Deploy

on:
  workflow_run:
    workflows: ["Build Docker Image (CI)"]
    types:
      - completed

env:
  PROJECT_ID: your-project-id
  REGION: us-east1
  GKE_CLUSTER_NAME: your-cluster-name

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK and kubectl
        uses: google-github-actions/setup-gcloud@v2
        with:
          install_components: "kubectl"

      - name: Get GKE credentials
        run: |
          gcloud container clusters get-credentials $GKE_CLUSTER_NAME --region $REGION --project $PROJECT_ID

      - name: Set up Kustomize
        run: |
          cd /tmp
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          sudo mv kustomize /usr/local/bin/
          cd -

      - name: Create namespace if not exists
        run: |
          kubectl create namespace production --dry-run=client -o yaml | kubectl apply -f -

      - name: Deploy with Kustomize
        run: |
          kustomize build kustomize/prod | kubectl apply -f -
          kubectl rollout restart deployment/gcp-cicd -n production

      - name: Verify Deployment
        run: |
          kubectl rollout status deployment/gcp-cicd -n production --timeout=5m
          kubectl get pods -n production
          kubectl get svc -n production
```

---

## GCP Setup

### 1. Create GKE Cluster

```bash
gcloud container clusters create gcpcicd \
  --region us-east1 \
  --num-nodes 1 \
  --machine-type e2-medium
```

### 2. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create gcp-cicd \
  --repository-format=docker \
  --location=us-east1
```

### 3. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions-sa \
  --display-name="GitHub Actions SA"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 4. Add Secret to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings > Secrets and variables > Actions**
3. Click **New repository secret**
4. Name: `GCP_SA_KEY`
5. Value: Contents of `key.json` file

### 5. Configure DNS (for SSL)

1. Get Ingress IP: `kubectl get ingress -n production`
2. Add A record in your DNS provider:
   - Type: A
   - Name: your-subdomain
   - Value: Ingress IP

---

## Deployment Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT FLOW                           │
└──────────────────────────────────────────────────────────────────┘

1. DEVELOPER PUSH
   └── git push origin main

2. BUILD WORKFLOW (CI)
   ├── Checkout code
   ├── Authenticate to GCP
   ├── Build Docker image
   └── Push to Artifact Registry
       ├── :sha-run_number (versioned)
       └── :latest

3. RELEASE WORKFLOW (CD) - Triggered by Build success
   ├── Checkout code
   ├── Authenticate to GCP
   ├── Get GKE credentials
   ├── Create namespace (if not exists)
   ├── Apply Kustomize manifests
   ├── Restart deployment
   └── Verify deployment

4. GKE CLUSTER
   ├── Pulls new :latest image
   ├── Rolls out new pods
   └── Terminates old pods

5. USER ACCESS
   └── https://your.domain.com
       ├── Cloud CDN (cached content)
       ├── SSL termination (Ingress)
       └── Nginx serves app
```

---

## Verification Steps

### Check Build Status

1. Go to GitHub repository > **Actions** tab
2. Verify "Build Docker Image (CI)" workflow passed

### Check Release Status

1. Go to GitHub repository > **Actions** tab
2. Verify "Release and Deploy" workflow passed

### Check Kubernetes Resources

```bash
# Get pods
kubectl get pods -n production

# Get services
kubectl get svc -n production

# Get ingress
kubectl get ingress -n production

# Check managed certificate status
kubectl get managedcertificate -n production

# View deployment details
kubectl describe deployment gcp-cicd -n production
```

### Check Application

```bash
# Test via curl
curl -I https://your.domain.com

# Expected headers for static assets:
# Cache-Control: public, max-age=31536000, immutable

# Expected headers for index.html:
# Cache-Control: no-cache, no-store, must-revalidate
```

### Common Issues & Troubleshooting

| Issue                  | Cause                           | Solution                                         |
| ---------------------- | ------------------------------- | ------------------------------------------------ |
| Image pull error       | Wrong image path or permissions | Verify Artifact Registry path and SA permissions |
| Namespace not found    | Namespace doesn't exist         | Run `kubectl create namespace production`        |
| Certificate not active | DNS not configured              | Point DNS A record to Ingress IP                 |
| 404 on Ingress         | Service not found               | Verify Service name matches Ingress backend      |
| Old content served     | CDN cached old version          | Purge CDN cache                                  |

---

## Summary

This CI/CD pipeline provides:

- ✅ **Automated builds** on every push to main
- ✅ **Automated deployments** after successful builds
- ✅ **Docker containerization** with multi-stage builds
- ✅ **Kubernetes orchestration** with Kustomize overlays
- ✅ **SSL/TLS encryption** with Google Managed Certificates
- ✅ **CDN caching** with Cloud CDN
- ✅ **Environment separation** (dev, qa, prod)

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Kubernetes Engine](https://cloud.google.com/kubernetes-engine/docs)
- [Kustomize Documentation](https://kustomize.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Cloud CDN Documentation](https://cloud.google.com/cdn/docs)
