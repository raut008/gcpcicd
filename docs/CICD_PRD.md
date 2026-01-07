# 🚀 Complete Guide to CI/CD and Kubernetes Deployment

This documentation explains every aspect of our codebase, CI/CD pipeline, and Kubernetes configuration in detail. Perfect for onboarding new team members.

---

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [Kubernetes Fundamentals](#kubernetes-fundamentals)
4. [Detailed Kubernetes YAML Explanations](#detailed-kubernetes-yaml-explanations)
5. [Kustomize - Managing Multiple Environments](#kustomize---managing-multiple-environments)
6. [CI/CD Workflows](#cicd-workflows)
7. [The Complete Flow](#the-complete-flow)
8. [Common Commands](#common-commands)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## Project Overview

This is a React Counter App that gets:
1. **Built** using Node.js
2. **Packaged** into a Docker container with Nginx
3. **Deployed** to Google Kubernetes Engine (GKE)
4. **Exposed** to the internet via Ingress with SSL

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **React** | Frontend application |
| **Docker** | Containerization |
| **Nginx** | Web server inside container |
| **Kubernetes (K8s)** | Container orchestration |
| **Kustomize** | K8s manifest management |
| **GitHub Actions** | CI/CD automation |
| **GKE** | Google's managed Kubernetes |
| **Artifact Registry** | Docker image storage |

---

## Folder Structure

```
counter-app-master/
├── .github/
│   └── workflows/
│       ├── build.yml          # CI: Build & push Docker image
│       └── release.yml        # CD: Deploy to Kubernetes
├── kustomize/
│   ├── base/                  # Shared resources (service)
│   │   ├── kustomization.yaml
│   │   └── service.yaml
│   ├── dev/                   # Development environment
│   │   ├── kustomization.yaml
│   │   └── deployment.yaml
│   ├── qa/                    # QA environment
│   │   ├── kustomization.yaml
│   │   └── deployment.yaml
│   └── prod/                  # Production environment
│       ├── kustomization.yaml
│       ├── deployment.yaml
│       ├── ingress.yaml
│       ├── managed-cert.yaml
│       └── backend-config.yaml
├── nginx/                     # Nginx configuration
├── src/                       # React source code
├── Dockerfile                 # Container build instructions
└── package.json               # Node.js dependencies
```

---

## Kubernetes Fundamentals

Before diving into the YAML files, let's understand the core Kubernetes concepts:

### What is Kubernetes?

Kubernetes (K8s) is a container orchestration platform that:
- **Runs** your containers across multiple servers
- **Scales** your app up/down automatically
- **Heals** by restarting failed containers
- **Load balances** traffic across containers
- **Manages** deployments with zero downtime

### Core Kubernetes Objects

```
┌─────────────────────────────────────────────────────────────────┐
│                        KUBERNETES CLUSTER                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      NAMESPACE                            │   │
│  │                    (e.g., production)                     │   │
│  │                                                           │   │
│  │   ┌─────────────────────────────────────────────────┐    │   │
│  │   │                  DEPLOYMENT                      │    │   │
│  │   │           (manages ReplicaSets & Pods)           │    │   │
│  │   │                                                  │    │   │
│  │   │   ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │   │
│  │   │   │   POD    │  │   POD    │  │   POD    │      │    │   │
│  │   │   │┌────────┐│  │┌────────┐│  │┌────────┐│      │    │   │
│  │   │   ││Container││  ││Container││  ││Container││      │    │   │
│  │   │   │└────────┘│  │└────────┘│  │└────────┘│      │    │   │
│  │   │   └──────────┘  └──────────┘  └──────────┘      │    │   │
│  │   └─────────────────────────────────────────────────┘    │   │
│  │                          ▲                                │   │
│  │                          │ routes traffic                 │   │
│  │   ┌─────────────────────────────────────────────────┐    │   │
│  │   │                   SERVICE                        │    │   │
│  │   │        (stable endpoint for pods)                │    │   │
│  │   └─────────────────────────────────────────────────┘    │   │
│  │                          ▲                                │   │
│  │                          │ routes HTTP traffic            │   │
│  │   ┌─────────────────────────────────────────────────┐    │   │
│  │   │                   INGRESS                        │    │   │
│  │   │      (external access with SSL & routing)        │    │   │
│  │   └─────────────────────────────────────────────────┘    │   │
│  │                          ▲                                │   │
│  └──────────────────────────│───────────────────────────┘   │
│                             │                                 │
└─────────────────────────────│─────────────────────────────────┘
                              │
                    🌐 INTERNET (Users)
```

### Key Concepts Explained

| Object | What It Does | Analogy |
|--------|-------------|---------|
| **Pod** | Smallest deployable unit; runs one or more containers | A single worker |
| **Deployment** | Manages pods; handles scaling and updates | A team manager |
| **Service** | Stable network endpoint for pods | Reception desk |
| **Ingress** | Routes external HTTP/HTTPS traffic | Front door |
| **Namespace** | Logical isolation for resources | Different floors in a building |
| **ConfigMap** | Stores non-sensitive configuration | Settings file |
| **Secret** | Stores sensitive data (passwords, keys) | Vault |

---

## Detailed Kubernetes YAML Explanations

### 1. Deployment (`kustomize/prod/deployment.yaml`)

The Deployment tells Kubernetes HOW to run your application.

```yaml
apiVersion: apps/v1              # API version for Deployment resource
kind: Deployment                 # Type of Kubernetes object
metadata:
  name: gcp-cicd                 # Name of this deployment (must be unique in namespace)
spec:
  selector:                      # How to find pods that belong to this deployment
    matchLabels:
      app: gcp-cicd              # Must match pod template labels (IMMUTABLE!)
  template:                      # Pod template - blueprint for creating pods
    metadata:
      labels:
        app: gcp-cicd            # Labels attached to each pod (must match selector)
    spec:
      containers:
        - name: gcp-cicd         # Container name (for logs and debugging)
          image: us-east1-docker.pkg.dev/graphic-matrix-481507-u5/gcp-cicd/gcp-cicd:#{IMAGE_TAG}#
          #       └── region ──┘ └────── project-id ──────────┘ └─ repo ─┘ └─ image:tag ─┘
          imagePullPolicy: Always  # Always pull image (never use cached)
          ports:
            - containerPort: 80    # Port the container listens on
```

#### Key Fields Explained

| Field | Description | Important Notes |
|-------|-------------|-----------------|
| `apiVersion` | API version to use | `apps/v1` for Deployments |
| `kind` | Type of resource | Deployment, Service, Pod, etc. |
| `metadata.name` | Unique identifier | Used in kubectl commands |
| `spec.selector.matchLabels` | Pod selection criteria | ⚠️ **IMMUTABLE** - cannot be changed after creation |
| `spec.template` | Pod blueprint | All pods created will use this template |
| `spec.template.metadata.labels` | Pod labels | Must match `selector.matchLabels` |
| `image` | Docker image to run | Format: `registry/project/repo/image:tag` |
| `imagePullPolicy` | When to pull image | `Always`, `IfNotPresent`, or `Never` |
| `containerPort` | Internal port | Must match what app listens on (80 for Nginx) |

#### Image Tag Placeholder `#{IMAGE_TAG}#`

We use a placeholder instead of `latest` because:
- `latest` tag is ambiguous (which version is "latest"?)
- Kubernetes may not detect changes if tag doesn't change
- We want traceability (which commit is deployed?)

The CI/CD pipeline replaces `#{IMAGE_TAG}#` with the actual tag (e.g., `abc123-42`).

---

### 2. Service (`kustomize/base/service.yaml`)

The Service provides a stable endpoint to access pods.

```yaml
apiVersion: v1                   # Core API version
kind: Service                    # Type of Kubernetes object
metadata:
  name: gcp-cicd                 # Service name (used by other resources)
  labels:
    app: gcp-cicd                # Labels for organizing/selecting this service
  annotations:
    beta.cloud.google.com/backend-config: '{"default": "gcp-cicd-backendconfig"}'
    # ↑ Links this service to a BackendConfig for CDN/caching
spec:
  ports:
    - port: 80                   # Port the service listens on
      targetPort: 80             # Port on the container to forward to
  selector:
    app: gcp-cicd                # Selects pods with this label
```

#### How Service Finds Pods

```
Service (selector: app=gcp-cicd)
         │
         ├──► Pod 1 (labels: app=gcp-cicd) ✓ MATCHED
         ├──► Pod 2 (labels: app=gcp-cicd) ✓ MATCHED
         ├──► Pod 3 (labels: app=other)    ✗ NOT MATCHED
         └──► Pod 4 (labels: app=gcp-cicd) ✓ MATCHED
```

#### Service Types

| Type | Description | Use Case |
|------|-------------|----------|
| `ClusterIP` | Internal only (default) | Internal services |
| `NodePort` | Exposes on each node's IP | Development/testing |
| `LoadBalancer` | Creates cloud load balancer | Simple external access |

We don't specify a type (uses `ClusterIP`) because we use Ingress for external access.

---

### 3. Ingress (`kustomize/prod/ingress.yaml`)

The Ingress routes external HTTP/HTTPS traffic to services.

```yaml
apiVersion: networking.k8s.io/v1   # Networking API version
kind: Ingress                      # Type of Kubernetes object
metadata:
  name: gcpcicd-ingress            # Ingress name
  annotations:
    kubernetes.io/ingress.class: "gce"    # Use Google Cloud Load Balancer
    networking.gke.io/managed-certificates: gcpcicd-ssl  # Link to SSL certificate
spec:
  defaultBackend:                  # Fallback if no rules match
    service:
      name: gcp-cicd               # Service to route to
      port:
        number: 80                 # Service port
  rules:
    - host: gcpcicd.anand.theraut.com    # Domain name
      http:
        paths:
          - path: /                       # URL path
            pathType: Prefix              # Match /anything
            backend:
              service:
                name: gcp-cicd            # Target service
                port:
                  number: 80              # Service port
```

#### Ingress vs Load Balancer

```
                    LOAD BALANCER (Simple)
                    ┌─────────────┐
          Traffic → │ LB → Service│ → Pods
                    └─────────────┘
                    Only 1 service per LB


                    INGRESS (Smart Router)
                    ┌─────────────────────────────────┐
                    │           INGRESS               │
          Traffic → │  /api/*  → api-service → Pods  │
                    │  /app/*  → app-service → Pods  │
                    │  /*      → web-service → Pods  │
                    └─────────────────────────────────┘
                    Multiple services, 1 Load Balancer
```

#### Path Types

| Type | Matches |
|------|---------|
| `Exact` | Only exact path (`/foo` won't match `/foo/bar`) |
| `Prefix` | Path prefix (`/foo` matches `/foo`, `/foo/bar`, `/foo/bar/baz`) |

---

### 4. ManagedCertificate (`kustomize/prod/managed-cert.yaml`)

Google-managed SSL certificate for HTTPS.

```yaml
apiVersion: networking.gke.io/v1     # GKE-specific API
kind: ManagedCertificate             # Google-managed SSL cert
metadata:
  name: gcpcicd-ssl                  # Certificate name (referenced by Ingress)
spec:
  domains:
    - gcpcicd.anand.theraut.com      # Domain(s) to secure
```

#### How It Works

1. You create this resource
2. Google automatically:
   - Requests certificate from Let's Encrypt
   - Validates domain ownership
   - Renews before expiration
3. Takes 10-30 minutes to provision

#### Prerequisites

- Domain DNS must point to the Ingress IP
- Domain must be publicly accessible

---

### 5. BackendConfig (`kustomize/prod/backend-config.yaml`)

Configures Google Cloud Load Balancer features like CDN.

```yaml
apiVersion: cloud.google.com/v1      # Google Cloud API
kind: BackendConfig                  # Backend configuration
metadata:
  name: gcp-cicd-backendconfig       # Name (referenced in Service annotation)
spec:
  cdn:
    enabled: true                    # Enable Cloud CDN
    cachePolicy:
    cacheMode: USE_ORIGIN_HEADERS    # Respect Cache-Control headers from Nginx
```

#### CDN Cache Modes

| Mode | Description |
|------|-------------|
| `USE_ORIGIN_HEADERS` | Respect `Cache-Control` headers from your server |
| `FORCE_CACHE_ALL` | Cache everything (even without headers) |
| `CACHE_ALL_STATIC` | Cache common static files (js, css, images) |

---

## Kustomize - Managing Multiple Environments

### What is Kustomize?

Kustomize lets you customize Kubernetes manifests for different environments WITHOUT duplicating files.

### Our Kustomize Structure

```
kustomize/
├── base/                      # SHARED resources (inherited by all environments)
│   ├── kustomization.yaml     # Lists base resources
│   └── service.yaml           # Service is same for all environments
│
├── dev/                       # DEVELOPMENT environment
│   ├── kustomization.yaml     # Inherits base + dev-specific
│   └── deployment.yaml        # Dev deployment (maybe fewer resources)
│
├── qa/                        # QA environment
│   ├── kustomization.yaml     # Inherits base + qa-specific
│   └── deployment.yaml        # QA deployment
│
└── prod/                      # PRODUCTION environment
    ├── kustomization.yaml     # Inherits base + prod-specific
    ├── deployment.yaml        # Prod deployment
    ├── ingress.yaml           # Only prod has external access
    ├── managed-cert.yaml      # Only prod has SSL
    └── backend-config.yaml    # Only prod has CDN
```

### How Kustomization Files Work

#### Base (`kustomize/base/kustomization.yaml`)

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - service.yaml      # Only service in base (shared by all)
```

#### Environment Overlay (`kustomize/prod/kustomization.yaml`)

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production           # All resources go to this namespace

resources:
  - ../base                     # Inherit everything from base
  - deployment.yaml             # Add prod-specific deployment
  - managed-cert.yaml           # Prod-only: SSL certificate
  - ingress.yaml                # Prod-only: External access
  - backend-config.yaml         # Prod-only: CDN configuration
```

### Building Manifests with Kustomize

```bash
# Preview what will be generated for production
kustomize build kustomize/prod

# Apply directly to cluster
kustomize build kustomize/prod | kubectl apply -f -

# Or use kubectl directly (kubectl has kustomize built-in)
kubectl apply -k kustomize/prod
```

---

## CI/CD Workflows

### Workflow 1: Build (`build.yml`)

Triggered on every push to `main` branch.

```yaml
name: Build Docker Image (CI)

on:
  push:
    branches:
      - main                    # Only runs on main branch

env:                            # Environment variables (shared across all jobs)
  PROJECT_ID: graphic-matrix-481507-u5
  REGION: us-east1
  REPOSITORY: gcp-cicd
  IMAGE_NAME: gcp-cicd

jobs:
  build:
    runs-on: ubuntu-latest      # Use Ubuntu runner
    outputs:
      image_tag: ${{ steps.set_tag.outputs.image_tag }}  # Export for other workflows

    steps:
      # Step 1: Get the code
      - name: Checkout code
        uses: actions/checkout@v4

      # Step 2: Create unique image tag
      - name: Set image tag
        id: set_tag
        run: |
          IMAGE_TAG="${{ github.sha }}-${{ github.run_number }}"
          # Example: abc123def456-42
          echo "image_tag=$IMAGE_TAG" >> $GITHUB_OUTPUT

      # Step 3: Authenticate to Google Cloud
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}  # Service account key

      # Step 4: Configure Docker to push to Artifact Registry
      - name: Configure Docker for Artifact Registry
        run: |
          gcloud auth configure-docker $REGION-docker.pkg.dev

      # Step 5: Build the Docker image
      - name: Build Docker image
        run: |
          docker build \
            -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE_NAME:${{ steps.set_tag.outputs.image_tag }} .

      # Step 6: Push to Artifact Registry
      - name: Push Docker image
        run: |
          docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE_NAME:${{ steps.set_tag.outputs.image_tag }}

      # Step 7: Save tag for release workflow
      - name: Save image tag to artifact
        run: |
          echo "${{ steps.set_tag.outputs.image_tag }}" > image_tag.txt

      - name: Upload image tag artifact
        uses: actions/upload-artifact@v4
        with:
          name: image-tag
          path: image_tag.txt
          retention-days: 1
```

### Workflow 2: Release (`release.yml`)

Triggered when build workflow completes successfully.

```yaml
name: Release and Deploy

on:
  workflow_run:
    workflows: ["Build Docker Image (CI)"]  # Triggered by build workflow
    types:
      - completed

env:
  PROJECT_ID: graphic-matrix-481507-u5
  REGION: us-east1
  REPOSITORY: gcp-cicd
  IMAGE_NAME: gcp-cicd
  GKE_CLUSTER_NAME: gcpcicd

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}  # Only if build succeeded
    runs-on: ubuntu-latest

    steps:
      # Step 1: Get the code
      - name: Checkout code
        uses: actions/checkout@v4

      # Step 2: Download the image tag from build workflow
      - name: Download image tag artifact
        uses: actions/download-artifact@v4
        with:
          name: image-tag
          github-token: ${{ secrets.GITHUB_TOKEN }}
          run-id: ${{ github.event.workflow_run.id }}

      # Step 3: Read the image tag
      - name: Read image tag
        id: get_tag
        run: |
          IMAGE_TAG=$(cat image_tag.txt)
          echo "image_tag=$IMAGE_TAG" >> $GITHUB_OUTPUT
          echo "Using image tag: $IMAGE_TAG"

      # Step 4: Replace placeholder with actual tag
      - name: Replace IMAGE_TAG in deployment files
        run: |
          find kustomize -name "deployment.yaml" -exec sed -i 's/#{IMAGE_TAG}#/${{ steps.get_tag.outputs.image_tag }}/g' {} \;

      # Step 5: Authenticate to Google Cloud
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      # Step 6: Setup kubectl
      - name: Set up Cloud SDK and kubectl
        uses: google-github-actions/setup-gcloud@v2
        with:
          install_components: "kubectl"

      # Step 7: Get cluster credentials
      - name: Get GKE credentials
        run: |
          gcloud container clusters get-credentials $GKE_CLUSTER_NAME --region $REGION --project $PROJECT_ID

      # Step 8: Install Kustomize
      - name: Set up Kustomize
        run: |
          cd /tmp
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          sudo mv kustomize /usr/local/bin/
          cd -

      # Step 9: Create namespace
      - name: Create namespace if not exists
        run: |
          kubectl create namespace production --dry-run=client -o yaml | kubectl apply -f -

      # Step 10: Deploy!
      - name: Deploy with Kustomize
        run: |
          if [ -d "kustomize/prod" ]; then
            echo "Deploying with image tag: ${{ steps.get_tag.outputs.image_tag }}"
            kustomize build kustomize/prod | kubectl apply -f -
          else
            echo "Directory kustomize/prod does not exist. Skipping deployment."
          fi

      # Step 11: Verify deployment
      - name: Verify Deployment
        run: |
          kubectl get pods -n production -o wide
          kubectl get deployment gcp-cicd -n production
          kubectl rollout status deployment/gcp-cicd -n production --timeout=5m || true
```

---

## The Complete Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COMPLETE CI/CD FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │  Developer   │
  │  pushes code │
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                        BUILD WORKFLOW (CI)                                │
  │                                                                           │
  │  1. Checkout code                                                         │
  │  2. Create unique tag: abc123-42                                          │
  │  3. Build Docker image with Dockerfile                                    │
  │  4. Push image to: us-east1-docker.pkg.dev/.../gcp-cicd:abc123-42        │
  │  5. Save tag as artifact                                                  │
  └────────────────────────────────┬─────────────────────────────────────────┘
                                   │
                                   ▼ (triggers on success)
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                       RELEASE WORKFLOW (CD)                               │
  │                                                                           │
  │  1. Checkout code                                                         │
  │  2. Download image tag artifact (abc123-42)                               │
  │  3. Replace #{IMAGE_TAG}# → abc123-42 in deployment.yaml                  │
  │  4. Connect to GKE cluster                                                │
  │  5. kustomize build kustomize/prod | kubectl apply                        │
  │  6. Wait for rollout to complete                                          │
  └────────────────────────────────┬─────────────────────────────────────────┘
                                   │
                                   ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                        KUBERNETES CLUSTER                                 │
  │                                                                           │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │                     NAMESPACE: production                          │  │
  │  │                                                                     │  │
  │  │  ┌──────────────────────────────────────────────────────────────┐  │  │
  │  │  │                      DEPLOYMENT                               │  │  │
  │  │  │  - Detects new image tag                                      │  │  │
  │  │  │  - Creates new pods with new image                            │  │  │
  │  │  │  - Terminates old pods (rolling update)                       │  │  │
  │  │  │                                                               │  │  │
  │  │  │   ┌─────────┐  ┌─────────┐  ┌─────────┐                      │  │  │
  │  │  │   │ Pod     │  │ Pod     │  │ Pod     │  (with new image)    │  │  │
  │  │  │   │ :80     │  │ :80     │  │ :80     │                      │  │  │
  │  │  │   └─────────┘  └─────────┘  └─────────┘                      │  │  │
  │  │  └──────────────────────────────────────────────────────────────┘  │  │
  │  │                              ▲                                      │  │
  │  │                              │                                      │  │
  │  │  ┌──────────────────────────────────────────────────────────────┐  │  │
  │  │  │ SERVICE (gcp-cicd:80) ─────► routes to pods with app=gcp-cicd │  │  │
  │  │  │ + BackendConfig (CDN enabled)                                 │  │  │
  │  │  └──────────────────────────────────────────────────────────────┘  │  │
  │  │                              ▲                                      │  │
  │  │                              │                                      │  │
  │  │  ┌──────────────────────────────────────────────────────────────┐  │  │
  │  │  │ INGRESS ────────────────────────────────────────────────────│  │  │
  │  │  │   gcpcicd.anand.theraut.com/* → gcp-cicd:80                  │  │  │
  │  │  │   + ManagedCertificate (HTTPS)                               │  │  │
  │  │  └──────────────────────────────────────────────────────────────┘  │  │
  │  │                              ▲                                      │  │
  │  └──────────────────────────────│──────────────────────────────────┘  │
  │                                 │                                      │
  │  ┌──────────────────────────────────────────────────────────────────┐  │
  │  │              GOOGLE CLOUD LOAD BALANCER                          │  │
  │  │              + Cloud CDN (caches static assets)                  │  │
  │  └──────────────────────────────────────────────────────────────────┘  │
  └────────────────────────────────┬───────────────────────────────────────┘
                                   │
                                   ▼
                          🌐 INTERNET (Users)
                    https://gcpcicd.anand.theraut.com
```

---

## Common Commands

### Kubectl Commands

```bash
# Get all resources in production namespace
kubectl get all -n production

# Get pods with more details
kubectl get pods -n production -o wide

# Get deployment status
kubectl get deployment gcp-cicd -n production

# Watch pods (live updates)
kubectl get pods -n production -w

# Describe a resource (detailed info)
kubectl describe pod <pod-name> -n production
kubectl describe deployment gcp-cicd -n production
kubectl describe service gcp-cicd -n production
kubectl describe ingress gcpcicd-ingress -n production

# View logs
kubectl logs <pod-name> -n production
kubectl logs -f <pod-name> -n production  # Follow logs (live)
kubectl logs <pod-name> -n production --previous  # Previous container logs

# Execute command in pod
kubectl exec -it <pod-name> -n production -- /bin/sh

# Check rollout status
kubectl rollout status deployment/gcp-cicd -n production

# View rollout history
kubectl rollout history deployment/gcp-cicd -n production

# Check certificate status
kubectl get managedcertificate -n production
```

### Kustomize Commands

```bash
# Preview manifests (dry-run)
kustomize build kustomize/prod

# Apply manifests
kustomize build kustomize/prod | kubectl apply -f -

# Or use kubectl directly
kubectl apply -k kustomize/prod

# Delete all resources
kustomize build kustomize/prod | kubectl delete -f -
```

### GCloud Commands

```bash
# Get cluster credentials
gcloud container clusters get-credentials gcpcicd --region us-east1 --project graphic-matrix-481507-u5

# List images in Artifact Registry
gcloud artifacts docker images list us-east1-docker.pkg.dev/graphic-matrix-481507-u5/gcp-cicd

# Purge CDN cache
gcloud compute url-maps invalidate-cdn-cache <url-map-name> --path "/*"
```

---

## Troubleshooting Guide

### Problem: Pods not starting

```bash
# Check pod status
kubectl get pods -n production

# Look for errors
kubectl describe pod <pod-name> -n production

# Check logs
kubectl logs <pod-name> -n production
```

Common issues:
- `ImagePullBackOff`: Can't pull Docker image (check image path/permissions)
- `CrashLoopBackOff`: Container crashes on start (check logs)
- `Pending`: No resources available (check node capacity)

### Problem: Selector Immutable Error

```
The Deployment "gcp-cicd" is invalid: spec.selector: Invalid value: field is immutable
```

**Cause**: You can't change `spec.selector.matchLabels` on an existing deployment.

**Solution**: Either delete and recreate the deployment, or keep the original selector labels.

### Problem: Certificate Not Ready

```bash
# Check certificate status
kubectl get managedcertificate -n production
```

If status is not `Active`:
1. Verify DNS points to Ingress IP
2. Wait 10-30 minutes for provisioning
3. Check domain is publicly accessible

### Problem: 502 Bad Gateway

1. Check if pods are running: `kubectl get pods -n production`
2. Check if service endpoints exist: `kubectl get endpoints gcp-cicd -n production`
3. Check backend health in Google Cloud Console

### Problem: Old Content Still Showing (CDN Cache)

```bash
# Purge CDN cache
gcloud compute url-maps invalidate-cdn-cache <url-map-name> --path "/*"
```

Or wait for cache TTL to expire (based on Cache-Control headers).

---

## Quick Reference Card

| What | Command |
|------|---------|
| View pods | `kubectl get pods -n production` |
| View logs | `kubectl logs <pod-name> -n production` |
| Describe resource | `kubectl describe <type> <name> -n production` |
| Apply changes | `kustomize build kustomize/prod \| kubectl apply -f -` |
| Check rollout | `kubectl rollout status deployment/gcp-cicd -n production` |
| Enter pod shell | `kubectl exec -it <pod-name> -n production -- /bin/sh` |

---

## Additional Resources

- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [Kustomize Official Docs](https://kustomize.io/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Google Kubernetes Engine Docs](https://cloud.google.com/kubernetes-engine/docs)
- [Cloud CDN Docs](https://cloud.google.com/cdn/docs)

---

**Happy Deploying! 🚀**
