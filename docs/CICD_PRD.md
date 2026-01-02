# 🚀 The Adventure of Deploying Our App: A CI/CD Story

---

## Once Upon a Time...

There was a team who wanted to share their amazing app with the world. But how could they make sure their app was always up-to-date, fast, and secure? They needed a magical process called **CI/CD**!

---

## Meet the Heroes

- **You, the Developer:** The creator of the app.
- **GitHub Actions:** The helpful robot that builds and delivers the app.
- **Google Cloud:** The kingdom where the app lives.
- **Kubernetes:** The wise boss who keeps the app running smoothly.
- **Docker:** The sturdy box that carries the app everywhere.
- **Nginx:** The friendly gatekeeper who serves the app to visitors.
- **CDN:** The speedy messenger who delivers the app lightning-fast.

---

## The Quest Begins: Building the App

Our hero writes code in the `src/` folder, making sure everything is perfect. The app’s instructions live in `package.json`, and the hero uses their favorite tools to make the app shine.

---

## Packing the App for the Journey

To travel safely, the app needs a box. This box is built using a **Dockerfile**. The Dockerfile tells the robot:

1. Use Node.js to build the app.
2. Place the finished app into a Nginx box.
3. Use a special Nginx config to make the app fast and safe.

---

## Summoning the Robot: GitHub Actions

Whenever the hero pushes code to GitHub, the robot wakes up! In `.github/workflows/`, two scrolls guide the robot:

- `build.yml`: Builds the Docker box and sends it to Google’s Artifact Registry.
- `release.yml`: Tells Google Cloud to run the new app.

The robot:

- Builds the app.
- Packs it in a Docker box.
- Sends it to Google.
- Deploys it to Kubernetes.

---

## The Kingdom of Google Cloud

In this land, the hero must prepare:

- **GKE Cluster:** The playground for the app.
- **Artifact Registry:** The shelf for Docker boxes.
- **Service Account:** The magic key for the robot.

The hero creates these, gives the robot the key, and stores it safely in GitHub.

---

## The Magic Scrolls: Kubernetes & Kustomize

The hero writes scrolls (YAML files) to tell Kubernetes how to run the app:

- **Base scrolls:** The basic rules for running the app.
- **Prod scrolls:** Special rules for real users.

These scrolls include:

- `deployment.yaml`: How many app copies to run.
- `service.yaml`: How visitors can talk to the app.
- `ingress.yaml`: The app’s address in the kingdom.
- `managed-cert.yaml`: The spell for a free HTTPS lock.
- `backend-config.yaml`: The speed spell (CDN).

---

## The Journey of a Visitor

When someone wants to visit the app:

1. They type the app’s address in their browser.
2. The kingdom’s **DNS** points to the Ingress gate.
3. **Cloud CDN** checks if it already has the app. If yes, it delivers it super fast!
4. If not, the **Load Balancer** sends the visitor to Kubernetes.
5. **Ingress** routes the visitor to the right app.
6. **Service** finds a healthy app pod.
7. **Nginx** welcomes the visitor and serves the app.

---

## The Ritual: Deploying the App

1. The hero writes code and pushes it to GitHub.
2. The robot builds and deploys the app automatically.
3. The hero checks Google Cloud Console to see the app running.
4. Visitors from all over the world can now enjoy the app!

---

## Checking the Magic

- Visit GitHub > Actions: Are "Build" and "Release" green? The magic worked!
- In Google Cloud Console:
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

- **CI/CD** lets robots build and deploy the app, so the hero can focus on creating.
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

**And they all deployed happily ever after.**

---

## 🏗️ What Happens in the Build Workflow? (The Robot's First Job)

Let's peek behind the curtain and see what the robot (GitHub Actions) does in the **build workflow**:

### 1. The Robot Wakes Up

- The robot starts its work **every time you push code to the `main` branch**.

### 2. The Robot Gets Ready

- It uses a fresh computer (called `ubuntu-latest`) provided by GitHub.
- It checks out your code from GitHub so it can see all your files.

### 3. The Robot Talks to Google Cloud

- The robot uses a special key (a secret stored in GitHub) to log in to Google Cloud.
- This lets it push Docker images to your Google Artifact Registry.

### 4. The Robot Prepares Docker

- It runs a command so Docker knows how to talk to Google’s Artifact Registry.

### 5. The Robot Builds the Docker Image

- The robot runs the `docker build` command.
- This command:
  - Reads your `Dockerfile`.
  - Installs dependencies and builds your app.
  - Packages everything into a Docker image (a "box" with your app inside).
- The image is tagged with **two names**:
  - One is unique for this build: `${{ github.sha }}-${{ github.run_number }}`
  - One is always called `latest` (so the newest version is easy to find).

### 6. The Robot Pushes the Image to Google

- The robot runs `docker push` twice:
  - Once for the unique tag.
  - Once for the `latest` tag.
- Both images are sent to **Google Artifact Registry** (your private Docker image shelf in Google Cloud).

### 7. The Robot's Work is Done

- Now, your app's Docker image is safely stored in Google Cloud, ready for the next step: deployment!

---

## 🏁 What Happens in the Release Workflow? (The Robot's Second Job)

Let’s follow the robot (GitHub Actions) as it does the **release workflow**—the part where your app actually goes live!

### 1. The Robot Waits for a Signal

- The release workflow starts **only after** the build workflow finishes successfully.
- It listens for a "Build Docker Image (CI)" workflow to complete.

### 2. The Robot Gets Ready

- It uses a fresh computer (`ubuntu-latest`) provided by GitHub.
- It checks out your code from GitHub.

### 3. The Robot Logs in to Google Cloud

- It uses the secret key (from GitHub secrets) to log in to Google Cloud.
- This lets it talk to your Google Kubernetes Engine (GKE) cluster.

### 4. The Robot Prepares Tools

- It installs `kubectl` (the tool to talk to Kubernetes).
- It gets the credentials for your GKE cluster, so it can control it.
- It installs `kustomize`, a tool that helps manage Kubernetes files.

### 5. The Robot Checks the Setup

- It lists the files and folders to make sure everything is in the right place.

### 6. The Robot Makes Sure the Playground Exists

- It creates the `production` namespace in Kubernetes if it doesn’t already exist.

### 7. The Robot Deploys the App

- It uses `kustomize` to build the final Kubernetes manifests from your files.
- It applies these manifests to the GKE cluster, updating or creating resources.
- It restarts the deployment so the new Docker image (the latest one you built) is used.

### 8. The Robot Checks Everything

- It waits for the deployment to finish rolling out.
- It checks the status of pods, deployments, and replica sets.
- It shows logs from the pods so you can see if anything went wrong.

### 9. The Robot’s Work is Done

- Your app is now running in Google Cloud, ready for the world to use!

---

**In summary:**

- The release workflow is the robot that takes your Docker image and updates your app in Google Kubernetes Engine.
- It makes sure everything is healthy and running, so your users always get the latest version!
