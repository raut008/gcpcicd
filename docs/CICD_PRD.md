# 🚀 The Adventure of Deploying Our App: A CI/CD Story

---

## What is CI/CD and Why Do We Need It?

Continuous Integration and Continuous Deployment (**CI/CD**) is a process that automates building, testing, and deploying your app. It ensures your app is always up-to-date, fast, and secure—so you can focus on creating, not manual deployments.

---

## Meet the Heroes

- **You, the Developer:** The creator of the app.
- **GitHub Actions:** The robot that builds and delivers the app.
- **Google Cloud:** The kingdom where the app lives.
- **Kubernetes:** The wise boss who keeps the app running smoothly.
- **Docker:** The sturdy box that carries the app everywhere.
- **Nginx:** The gatekeeper who serves the app to visitors.
- **CDN:** The speedy messenger who delivers the app lightning-fast.

---

## The Journey Begins: Building and Packing the App

You write code in the `src/` folder. The app’s instructions live in `package.json`.  
To travel safely, the app is packed in a **Docker image** using a `Dockerfile`:

1. Node.js builds the app.
2. The finished app is placed in a Nginx box.
3. Nginx config makes the app fast and safe.

---

## Summoning the Robot: GitHub Actions

Whenever you push code to GitHub, the robot wakes up!  
In `.github/workflows/`, two files guide the robot:

- `build.yml`: Builds the Docker image and sends it to Google’s Artifact Registry.
- `release.yml`: Tells Google Cloud to run the new app.

The robot:

- Builds the app.
- Packs it in Docker.
- Sends it to Google.
- Deploys it to Kubernetes.

---

## The Kingdom of Google Cloud

You prepare:

- **GKE Cluster:** The playground for the app.
- **Artifact Registry:** The shelf for Docker images.
- **Service Account:** The magic key for the robot.

---

## 📁 What Are All These Files and Folders For?

Here’s how each file and folder fits into your Kubernetes deployment and CI/CD pipeline:

### `base` Folder

- **Purpose:**  
  Contains generic, reusable Kubernetes manifests (deployment, service, ingress, etc.)—the foundation for all environments.

### `prod` Folder

- **Purpose:**  
  Contains overlays and customizations for production (resource limits, replica counts, domain names, secrets).

### `kustomization.yaml`

- **Purpose:**  
  Combines and customizes multiple manifests for different environments (base, prod), making deployments flexible and organized.

### `deployment.yaml`

- **Purpose:**  
  Describes how your app runs in Kubernetes—Docker image, pods, resource limits, environment variables, update strategy.

### `service.yaml`

- **Purpose:**  
  Creates a stable internal endpoint and load balancer for your app pods, so other resources (like Ingress) can reach them reliably.

### `ingress.yaml`

- **Purpose:**  
  Routes external traffic from the internet to your app’s service, sets up public URLs, and integrates with Google Cloud Load Balancer.

### `managed-cert.yaml`

- **Purpose:**  
  Requests and manages HTTPS certificates for your domain, enabling secure connections.

### `backend-config.yaml`

- **Purpose:**  
  Configures backend optimizations like Cloud CDN, caching, and custom timeouts for better performance.

---

## 🧩 How Do All These Kubernetes Files Work Together?

Let’s connect the dots and see why each file exists and how they combine to make your app work with CI/CD:

- `deployment.yaml` runs your app containers.
- `service.yaml` exposes your app inside the cluster.
- `ingress.yaml` exposes your app to the internet.
- `backend-config.yaml` and `managed-cert.yaml` add speed and security.
- `kustomization.yaml` organizes and patches everything for each environment.

---

## 🏗️ What Happens in the Build Workflow? (The Robot's First Job)

1. **Code Push:**  
   You push code to GitHub.
2. **Build Workflow:**  
   GitHub Actions builds a Docker image and pushes it to Artifact Registry.
   - Reads your `Dockerfile`.
   - Installs dependencies and builds your app.
   - Packages everything into a Docker image.
   - Tags and pushes the image to Google Artifact Registry.

---

## 🏁 What Happens in the Release Workflow? (The Robot's Second Job)

1. **Release Workflow:**  
   Starts after the build workflow finishes.
2. **Preparation:**
   - Logs in to Google Cloud.
   - Installs `kubectl` and `kustomize`.
   - Gets GKE credentials.
3. **Deployment:**
   - Uses `kustomization.yaml` to assemble all manifests.
   - Applies them to the cluster.
   - Restarts the deployment so the new Docker image is used.
   - Waits for rollout and checks pod status.

---

## 🔗 How Do These Files Combine With CI/CD?

1. **Code Push:**  
   You push code to GitHub.
2. **Build Workflow:**  
   Docker image is built and pushed.
3. **Release Workflow:**  
   All manifests are assembled and applied.
4. **Kubernetes:**
   - Pulls the new image from Artifact Registry.
   - Updates pods via rolling update.
   - Routes traffic via Service and Ingress.
   - Secures traffic with Managed Certificate.
   - Speeds up delivery with Backend Config and CDN.

---

## The Journey of a Visitor

1. Visitor types your app’s address.
2. DNS points to the Ingress gate.
3. Cloud CDN checks cache; if not cached, Load Balancer sends to Kubernetes.
4. Ingress routes to the Service.
5. Service finds a healthy pod.
6. Nginx serves the app.

---

## Checking the Magic

- GitHub Actions: Are "Build" and "Release" green?
- Google Cloud Console:
  - GKE > Workloads: The app is alive.
  - GKE > Services & Ingress: The Ingress IP is ready.
- Visit the app’s website: It should load with a shiny 🔒 lock.
- Use `curl -I https://your.domain.com/static/js/main.js` to see the cache magic.

---

## Troubles on the Road? Here’s the Spellbook

- **App not loading?**
  - Check pod logs: `kubectl logs <pod-name> -n production`
  - Are pods running? `kubectl get pods -n production`
- **No HTTPS?**
  - Wait for the certificate spell (10-30 min).
  - Make sure DNS points to the Ingress IP.
- **Old or slow content?**
  - Purge the CDN cache in Google Cloud Console.
- **404 errors?**
  - Check that Service and Ingress names match.

---

## The Moral of the Story

- **CI/CD** lets robots build and deploy the app, so you can focus on creating.
- **Docker** makes sure the app works everywhere.
- **Kubernetes** keeps the app healthy and strong.
- **Nginx** serves the app with speed and care.
- **Ingress & Load Balancer** give the app a home and a secure door.
- **CDN** delivers the app to visitors at lightning speed.

---

## The End (Or Is It Just the Beginning?)

Now, anyone can follow this story to build, deploy, and share their app with the world.  
Just write code, push to GitHub, and let the magic happen!

---

## Want to Learn More?

- [GitHub Actions](https://docs.github.com/en/actions)
- [Google Kubernetes Engine](https://cloud.google.com/kubernetes-engine/docs)
- [Kustomize](https://kustomize.io/)
- [Nginx](https://nginx.org/en/docs/)
- [Cloud CDN](https://cloud.google.com/cdn/docs)

---

## 🆚 What’s the Difference Between Ingress and Load Balancer?

**Load Balancer:**

- A cloud resource (like Google Cloud Load Balancer) that provides a single external IP address and distributes incoming traffic across backend services or nodes.
- In Kubernetes, a Service of type `LoadBalancer` creates this cloud load balancer automatically.
- It’s simple: all traffic goes to one Service.

**Ingress:**

- A Kubernetes resource that manages and routes HTTP/HTTPS traffic to multiple Services based on rules (like URL paths or hostnames).
- Ingress sits behind the cloud load balancer and acts as a smart router, handling SSL termination, path-based routing, and more.
- Allows you to expose multiple apps/services under one IP/domain.

**Summary:**

- **Load Balancer**: Distributes traffic to one Service.
- **Ingress**: Routes traffic to different Services based on rules, using one Load Balancer.

---

### Why Was Ingress Needed If You Started With a Load Balancer?

When you first deploy with a Service of type `LoadBalancer`, you get a single external IP and simple traffic routing to your app.  
However, as your needs grow (multiple apps, custom domains, HTTPS, path-based routing, or advanced rules), a Load Balancer alone isn’t enough.

**Ingress was needed because:**
- It lets you route traffic to different services based on hostnames or paths.
- It enables SSL termination and managed certificates.
- It supports advanced features like URL rewrites, redirects, and integration with Cloud CDN.
- You can expose multiple apps under one IP/domain.

**In summary:**  
Ingress adds flexibility, security, and smarter routing on top of the basic Load Balancer, making it essential for production-grade deployments.

---

**And they all deployed happily ever after.**
