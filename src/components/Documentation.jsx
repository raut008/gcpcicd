import React, { Component } from "react";
import "./Documentation.css";
import LoadingSpinner from "./LoadingSpinner";

class Documentation extends Component {
  state = {
    activeSection: null,
    searchTerm: "",
    isLoading: true,
    loadingError: null,
    isMobileMenuOpen: false,
    copiedCodeId: null,
  };

  componentDidMount() {
    // Simulate loading time for demonstration
    // In a real app, this would be actual data fetching
    this.loadingTimer = setTimeout(() => {
      this.setState({ isLoading: false });
    }, 1000);
  }

  componentWillUnmount() {
    // Cleanup timer if component unmounts before loading completes
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
    }
  }

  sections = [
    { id: "overview", title: "Project Overview", icon: "🚀" },
    { id: "structure", title: "Folder Structure", icon: "📁" },
    { id: "k8s-basics", title: "Kubernetes Basics", icon: "☸️" },
    { id: "deployment", title: "Deployment YAML", icon: "📦" },
    { id: "service", title: "Service YAML", icon: "🔌" },
    { id: "ingress", title: "Ingress YAML", icon: "🚪" },
    { id: "certificate", title: "SSL Certificate", icon: "🔒" },
    { id: "backend-config", title: "Backend Config", icon: "⚡" },
    { id: "kustomize", title: "Kustomize", icon: "🧩" },
    { id: "cicd", title: "CI/CD Workflows", icon: "🔄" },
    { id: "commands", title: "Common Commands", icon: "💻" },
    { id: "troubleshooting", title: "Troubleshooting", icon: "🔧" },
  ];

  scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      this.setState({ activeSection: id, isMobileMenuOpen: false });
    }
  };

  toggleMobileMenu = () => {
    this.setState((prevState) => ({
      isMobileMenuOpen: !prevState.isMobileMenuOpen,
    }));
  };

  closeMobileMenu = () => {
    this.setState({ isMobileMenuOpen: false });
  };

  handleSearchChange = (e) => {
    this.setState({ searchTerm: e.target.value });
  };

  clearSearch = () => {
    this.setState({ searchTerm: "" });
  };

  copyToClipboard = async (text, codeId) => {
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copiedCodeId: codeId });
      setTimeout(() => {
        this.setState({ copiedCodeId: null });
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  getFilteredSections = () => {
    const { searchTerm } = this.state;
    if (!searchTerm.trim()) {
      return this.sections;
    }
    const term = searchTerm.toLowerCase();
    return this.sections.filter(
      (section) =>
        section.title.toLowerCase().includes(term) ||
        section.id.toLowerCase().includes(term)
    );
  };

  highlightText = (text, searchTerm) => {
    if (!searchTerm.trim()) {
      return text;
    }
    const parts = text.split(new RegExp(`(${searchTerm})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={index} className="search-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  renderCodeBlock = (code, header, codeId) => {
    const isCopied = this.state.copiedCodeId === codeId;
    return (
      <div className="code-block">
        {header && <div className="code-header">{header}</div>}
        <div className="code-content-wrapper">
          <pre>{code}</pre>
          <button
            className={`copy-code-btn ${isCopied ? "copied" : ""}`}
            onClick={() => this.copyToClipboard(code, codeId)}
            aria-label="Copy code"
            title={isCopied ? "Copied!" : "Copy code"}
          >
            {isCopied ? "✓ Copied" : "📋 Copy"}
          </button>
        </div>
      </div>
    );
  };

  render() {
    // Show loading spinner while content is loading
    if (this.state.isLoading) {
      return <LoadingSpinner message="Loading documentation..." />;
    }

    // Show error state if loading failed
    if (this.state.loadingError) {
      return (
        <div className="docs-error" style={{ padding: "40px", textAlign: "center" }}>
          <h2>⚠️ Failed to load documentation</h2>
          <p>{this.state.loadingError}</p>
          <button 
            className="btn btn-primary" 
            onClick={() => this.setState({ isLoading: true, loadingError: null })}
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="docs-container">
        {/* Mobile Menu Overlay */}
        {this.state.isMobileMenuOpen && <div className="mobile-menu-overlay" onClick={this.closeMobileMenu}></div>}

        {/* Mobile Menu Toggle Button */}
        <button className="mobile-menu-toggle" onClick={this.toggleMobileMenu} aria-label="Toggle menu">
          <span className={`hamburger ${this.state.isMobileMenuOpen ? "active" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        {/* Sidebar Navigation */}
        <nav className={`docs-sidebar ${this.state.isMobileMenuOpen ? "mobile-open" : ""}`}>
          <div className="docs-sidebar-header">
            <h2>📚 CI/CD Guide</h2>
            <p>Kubernetes & DevOps</p>
          </div>
          {/* Search Bar */}
          <div className="docs-search-container">
            <div className="docs-search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="docs-search-input"
                placeholder="Search sections..."
                value={this.state.searchTerm}
                onChange={this.handleSearchChange}
              />
              {this.state.searchTerm && (
                <button
                  className="search-clear-btn"
                  onClick={this.clearSearch}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {this.state.searchTerm && (
              <div className="search-results-count">
                {this.getFilteredSections().length} result{this.getFilteredSections().length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
          <ul className="docs-nav">
            {this.getFilteredSections().map((section) => (
              <li
                key={section.id}
                className={this.state.activeSection === section.id ? "active" : ""}
                onClick={() => this.scrollToSection(section.id)}
                onTouchStart={() => {}} // Improve touch responsiveness
              >
                <span className="nav-icon">{section.icon}</span>
                {this.highlightText(section.title, this.state.searchTerm)}
              </li>
            ))}
            {this.getFilteredSections().length === 0 && (
              <li className="no-results">
                <span>No sections found</span>
              </li>
            )}
          </ul>
        </nav>

        {/* Main Content */}
        <main className="docs-content">
          {/* Header */}
          <header className="docs-header">
            <h1>🚀 Complete Guide to CI/CD and Kubernetes Deployment</h1>
            <p className="docs-subtitle">Everything you need to know about deploying applications to Kubernetes with GitHub Actions</p>
          </header>

          {/* Project Overview */}
          <section id="overview" className="docs-section">
            <h2>🚀 Project Overview</h2>
            <p>This is a Guide to CI/CD and Kubernetes Deployment that gets:</p>
            <ol className="styled-list">
              <li>
                <strong>Built</strong> using Node.js
              </li>
              <li>
                <strong>Packaged</strong> into a Docker container with Nginx
              </li>
              <li>
                <strong>Deployed</strong> to Google Kubernetes Engine (GKE)
              </li>
              <li>
                <strong>Exposed</strong> to the internet via Ingress with SSL
              </li>
            </ol>

            <h3>Key Technologies</h3>
            <div className="tech-grid">
              <div className="tech-card">
                <span className="tech-icon">⚛️</span>
                <h4>React</h4>
                <p>Frontend application</p>
              </div>
              <div className="tech-card">
                <span className="tech-icon">🐳</span>
                <h4>Docker</h4>
                <p>Containerization</p>
              </div>
              <div className="tech-card">
                <span className="tech-icon">☸️</span>
                <h4>Kubernetes</h4>
                <p>Container orchestration</p>
              </div>
              <div className="tech-card">
                <span className="tech-icon">🔧</span>
                <h4>Kustomize</h4>
                <p>K8s manifest management</p>
              </div>
              <div className="tech-card">
                <span className="tech-icon">🤖</span>
                <h4>GitHub Actions</h4>
                <p>CI/CD automation</p>
              </div>
              <div className="tech-card">
                <span className="tech-icon">☁️</span>
                <h4>GKE</h4>
                <p>Google's managed K8s</p>
              </div>
            </div>
          </section>

          {/* Folder Structure */}
          <section id="structure" className="docs-section">
            <h2>📁 Folder Structure</h2>
            {this.renderCodeBlock(`counter-app-master/
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
└── package.json               # Node.js dependencies`, null, "folder-structure")}
          </section>

          {/* Kubernetes Basics */}
          <section id="k8s-basics" className="docs-section">
            <h2>☸️ Kubernetes Fundamentals</h2>
            <p>Kubernetes (K8s) is a container orchestration platform that:</p>
            <ul className="feature-list">
              <li>
                <strong>Runs</strong> your containers across multiple servers
              </li>
              <li>
                <strong>Scales</strong> your app up/down automatically
              </li>
              <li>
                <strong>Heals</strong> by restarting failed containers
              </li>
              <li>
                <strong>Load balances</strong> traffic across containers
              </li>
              <li>
                <strong>Manages</strong> deployments with zero downtime
              </li>
            </ul>

            <h3>Core Kubernetes Objects</h3>
            <div className="diagram-box">
              <pre>{`┌─────────────────────────────────────────────────────────────────┐
│                        KUBERNETES CLUSTER                        │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      NAMESPACE                           │   │
│   │                    (e.g., production)                    │   │
│   │                                                          │   │
│   │   ┌──────────────────────────────────────────────────┐  │   │
│   │   │                  DEPLOYMENT                       │  │   │
│   │   │           (manages ReplicaSets & Pods)            │  │   │
│   │   │                                                   │  │   │
│   │   │   ┌─────────┐  ┌─────────┐  ┌─────────┐          │  │   │
│   │   │   │   POD   │  │   POD   │  │   POD   │          │  │   │
│   │   │   │Container│  │Container│  │Container│          │  │   │
│   │   │   └─────────┘  └─────────┘  └─────────┘          │  │   │
│   │   └──────────────────────────────────────────────────┘  │   │
│   │                          ▲                               │   │
│   │   ┌──────────────────────────────────────────────────┐  │   │
│   │   │              SERVICE (routes traffic)             │  │   │
│   │   └──────────────────────────────────────────────────┘  │   │
│   │                          ▲                               │   │
│   │   ┌──────────────────────────────────────────────────┐  │   │
│   │   │              INGRESS (external access)            │  │   │
│   │   └──────────────────────────────────────────────────┘  │   │
│   └──────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
└──────────────────────────────│───────────────────────────────────┘
                               │
                      🌐 INTERNET (Users)`}</pre>
            </div>

            <h3>Key Concepts</h3>
            <div className="table-wrapper">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Object</th>
                    <th>What It Does</th>
                    <th>Analogy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>Pod</code>
                    </td>
                    <td>Smallest unit; runs containers</td>
                    <td>A single worker</td>
                  </tr>
                  <tr>
                    <td>
                      <code>Deployment</code>
                    </td>
                    <td>Manages pods; handles scaling</td>
                    <td>A team manager</td>
                  </tr>
                  <tr>
                    <td>
                      <code>Service</code>
                    </td>
                    <td>Stable network endpoint</td>
                    <td>Reception desk</td>
                  </tr>
                  <tr>
                    <td>
                      <code>Ingress</code>
                    </td>
                    <td>Routes external HTTP traffic</td>
                    <td>Front door</td>
                  </tr>
                  <tr>
                    <td>
                      <code>Namespace</code>
                    </td>
                    <td>Logical isolation</td>
                    <td>Different floors</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Deployment YAML */}
          <section id="deployment" className="docs-section">
            <h2>📦 Deployment YAML Explained</h2>
            <p>
              The Deployment tells Kubernetes <strong>HOW</strong> to run your application.
            </p>

            {this.renderCodeBlock(`apiVersion: apps/v1              # API version for Deployment
kind: Deployment                 # Type of Kubernetes object
metadata:
  name: gcp-cicd                 # Deployment name (unique in namespace)
spec:
  selector:                      # How to find pods for this deployment
    matchLabels:
      app: gcp-cicd              # ⚠️ IMMUTABLE after creation!
  template:                      # Pod template - blueprint for pods
    metadata:
      labels:
        app: gcp-cicd            # Must match selector above
    spec:
      containers:
        - name: gcp-cicd
          image: us-east1-docker.pkg.dev/.../gcp-cicd:#{IMAGE_TAG}#
          imagePullPolicy: Always
          ports:
            - containerPort: 80`, "kustomize/prod/deployment.yaml", "deployment-yaml")}

            <div className="info-box warning">
              <h4>⚠️ Important: Selector is Immutable</h4>
              <p>
                The <code>spec.selector.matchLabels</code> field <strong>cannot be changed</strong> after a deployment is created. If you need to
                change it, you must delete and recreate the deployment.
              </p>
            </div>

            <h3>Image Tag Placeholder</h3>
            <p>
              We use <code>{"#{IMAGE_TAG}#"}</code> instead of <code>latest</code> because:
            </p>
            <ul className="feature-list">
              <li>
                <code>latest</code> is ambiguous - which version is "latest"?
              </li>
              <li>Kubernetes may not detect changes if the tag doesn't change</li>
              <li>We want traceability - know exactly which commit is deployed</li>
            </ul>
          </section>

          {/* Service YAML */}
          <section id="service" className="docs-section">
            <h2>🔌 Service YAML Explained</h2>
            <p>
              The Service provides a <strong>stable endpoint</strong> to access pods.
            </p>

            {this.renderCodeBlock(`apiVersion: v1
kind: Service
metadata:
  name: gcp-cicd
  labels:
    app: gcp-cicd
  annotations:
    beta.cloud.google.com/backend-config: '{"default": "gcp-cicd-backendconfig"}'
    # ↑ Links to BackendConfig for CDN/caching
spec:
  ports:
    - port: 80           # Service listens on this port
      targetPort: 80     # Forwards to container port
  selector:
    app: gcp-cicd        # Finds pods with this label`, "kustomize/base/service.yaml", "service-yaml")}

            <h3>How Service Finds Pods</h3>
            <div className="diagram-box">
              <pre>{`Service (selector: app=gcp-cicd)
         │
         ├──► Pod 1 (labels: app=gcp-cicd) ✓ MATCHED
         ├──► Pod 2 (labels: app=gcp-cicd) ✓ MATCHED
         ├──► Pod 3 (labels: app=other)    ✗ NOT MATCHED
         └──► Pod 4 (labels: app=gcp-cicd) ✓ MATCHED`}</pre>
            </div>
          </section>

          {/* Ingress YAML */}
          <section id="ingress" className="docs-section">
            <h2>🚪 Ingress YAML Explained</h2>
            <p>
              The Ingress routes <strong>external HTTP/HTTPS traffic</strong> to services.
            </p>

            {this.renderCodeBlock(`apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gcpcicd-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"           # Use Google Load Balancer
    networking.gke.io/managed-certificates: gcpcicd-ssl  # Link SSL cert
spec:
  defaultBackend:                    # Fallback if no rules match
    service:
      name: gcp-cicd
      port:
        number: 80
  rules:
    - host: gcpcicd.anand.theraut.com    # Your domain
      http:
        paths:
          - path: /                       # Match all paths
            pathType: Prefix
            backend:
              service:
                name: gcp-cicd
                port:
                  number: 80`, "kustomize/prod/ingress.yaml", "ingress-yaml")}

            <h3>Ingress vs Load Balancer</h3>
            <div className="comparison-grid">
              <div className="comparison-card">
                <h4>Load Balancer</h4>
                <p>Simple: One LB → One Service</p>
                <div className="diagram-small">
                  <pre>{`Traffic → [LB] → Service → Pods`}</pre>
                </div>
              </div>
              <div className="comparison-card">
                <h4>Ingress (Smart Router)</h4>
                <p>Advanced: One LB → Multiple Services</p>
                <div className="diagram-small">
                  <pre>{`         ┌→ /api/* → api-svc
Traffic → Ingress ─┼→ /app/* → app-svc
         └→ /*     → web-svc`}</pre>
                </div>
              </div>
            </div>
          </section>

          {/* SSL Certificate */}
          <section id="certificate" className="docs-section">
            <h2>🔒 Managed Certificate</h2>
            <p>Google-managed SSL certificate for HTTPS.</p>

            {this.renderCodeBlock(`apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: gcpcicd-ssl              # Referenced by Ingress
spec:
  domains:
    - gcpcicd.anand.theraut.com  # Domain(s) to secure`, "kustomize/prod/managed-cert.yaml", "managed-cert-yaml")}

            <div className="info-box info">
              <h4>ℹ️ How It Works</h4>
              <ol>
                <li>You create this resource</li>
                <li>Google automatically requests a certificate from Let's Encrypt</li>
                <li>Google validates domain ownership</li>
                <li>Certificate is auto-renewed before expiration</li>
                <li>
                  Takes <strong>10-30 minutes</strong> to provision
                </li>
              </ol>
            </div>
          </section>

          {/* Backend Config */}
          <section id="backend-config" className="docs-section">
            <h2>⚡ Backend Config (CDN)</h2>
            <p>Configures Google Cloud Load Balancer features like CDN.</p>

            {this.renderCodeBlock(`apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: gcp-cicd-backendconfig
spec:
  cdn:
    enabled: true                    # Enable Cloud CDN
    cachePolicy:
    cacheMode: USE_ORIGIN_HEADERS    # Respect Cache-Control headers`, "kustomize/prod/backend-config.yaml", "backend-config-yaml")}

            <h3>CDN Cache Modes</h3>
            <div className="table-wrapper">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Mode</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>USE_ORIGIN_HEADERS</code>
                    </td>
                    <td>Respect Cache-Control headers from your server</td>
                  </tr>
                  <tr>
                    <td>
                      <code>FORCE_CACHE_ALL</code>
                    </td>
                    <td>Cache everything (even without headers)</td>
                  </tr>
                  <tr>
                    <td>
                      <code>CACHE_ALL_STATIC</code>
                    </td>
                    <td>Cache common static files (js, css, images)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Kustomize */}
          <section id="kustomize" className="docs-section">
            <h2>🧩 Kustomize - Multi-Environment Management</h2>
            <p>
              Kustomize lets you customize Kubernetes manifests for different environments
              <strong> WITHOUT duplicating files</strong>.
            </p>

            <h3>Our Structure</h3>
            {this.renderCodeBlock(`kustomize/
├── base/                  # SHARED (inherited by all)
│   ├── kustomization.yaml
│   └── service.yaml       # Same service for all envs
│
├── dev/                   # DEV environment
│   ├── kustomization.yaml # namespace: dev
│   └── deployment.yaml
│
├── qa/                    # QA environment
│   ├── kustomization.yaml # namespace: qa
│   └── deployment.yaml
│
└── prod/                  # PRODUCTION
    ├── kustomization.yaml # namespace: production
    ├── deployment.yaml
    ├── ingress.yaml       # Only prod has external access
    ├── managed-cert.yaml  # Only prod has SSL
    └── backend-config.yaml`, null, "kustomize-structure")}

            <h3>How It Works</h3>
            {this.renderCodeBlock(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production           # All resources go here

resources:
  - ../base                     # Inherit from base
  - deployment.yaml             # Add prod deployment
  - managed-cert.yaml           # Prod-only resources
  - ingress.yaml
  - backend-config.yaml`, "kustomize/prod/kustomization.yaml", "kustomization-yaml")}
          </section>

          {/* CI/CD Workflows */}
          <section id="cicd" className="docs-section">
            <h2>🔄 CI/CD Workflows</h2>

            <h3>Workflow 1: Build (CI)</h3>
            <p>
              Triggered on every push to <code>main</code> branch.
            </p>
            <div className="flow-diagram">
              <div className="flow-step">
                <span className="step-num">1</span>
                <span>Checkout code</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">2</span>
                <span>Create image tag</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">3</span>
                <span>Auth to GCP</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">4</span>
                <span>Build Docker image</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">5</span>
                <span>Push to Artifact Registry</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">6</span>
                <span>Save tag as artifact</span>
              </div>
            </div>

            <h3>Workflow 2: Release (CD)</h3>
            <p>Triggered when build workflow completes successfully.</p>
            <div className="flow-diagram">
              <div className="flow-step">
                <span className="step-num">1</span>
                <span>Download tag artifact</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">2</span>
                <span>Replace #{"{IMAGE_TAG}"}#</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">3</span>
                <span>Connect to GKE</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">4</span>
                <span>kustomize build</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">5</span>
                <span>kubectl apply</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">6</span>
                <span>Verify rollout</span>
              </div>
            </div>

            <h3>Complete Flow Diagram</h3>
            <div className="diagram-box large">
              <pre>{`┌──────────────┐
│  Developer   │
│  pushes code │
└──────┬───────┘
       ▼
┌──────────────────────────────────────────────────┐
│              BUILD WORKFLOW (CI)                  │
│  Build Docker image → Push to Artifact Registry  │
│  Save image tag as artifact                       │
└──────────────────────────┬───────────────────────┘
                           ▼
┌──────────────────────────────────────────────────┐
│             RELEASE WORKFLOW (CD)                 │
│  Replace IMAGE_TAG → kustomize build → kubectl   │
└──────────────────────────┬───────────────────────┘
                           ▼
┌──────────────────────────────────────────────────┐
│              KUBERNETES CLUSTER                   │
│  Deployment → Service → Ingress → Load Balancer  │
└──────────────────────────┬───────────────────────┘
                           ▼
                    🌐 Users access app
             https://gcpcicd.anand.theraut.com`}</pre>
            </div>
          </section>

          {/* Common Commands */}
          <section id="commands" className="docs-section">
            <h2>💻 Common Commands</h2>

            <h3>Kubectl Commands</h3>
            <div className="command-grid">
              <div className="command-card">
                <code>kubectl get pods -n production</code>
                <p>List all pods in production</p>
              </div>
              <div className="command-card">
                <code>kubectl get all -n production</code>
                <p>List all resources</p>
              </div>
              <div className="command-card">
                <code>kubectl logs {"<pod-name>"} -n production</code>
                <p>View pod logs</p>
              </div>
              <div className="command-card">
                <code>kubectl logs -f {"<pod-name>"} -n production</code>
                <p>Follow logs (live)</p>
              </div>
              <div className="command-card">
                <code>kubectl describe pod {"<pod-name>"} -n production</code>
                <p>Detailed pod info</p>
              </div>
              <div className="command-card">
                <code>kubectl exec -it {"<pod-name>"} -n production -- /bin/sh</code>
                <p>Enter pod shell</p>
              </div>
              <div className="command-card">
                <code>kubectl rollout status deployment/gcp-cicd -n production</code>
                <p>Check rollout status</p>
              </div>
              <div className="command-card">
                <code>kubectl get managedcertificate -n production</code>
                <p>Check SSL cert status</p>
              </div>
            </div>

            <h3>Kustomize Commands</h3>
            <div className="command-grid">
              <div className="command-card">
                <code>kustomize build kustomize/prod</code>
                <p>Preview generated manifests</p>
              </div>
              <div className="command-card">
                <code>kustomize build kustomize/prod | kubectl apply -f -</code>
                <p>Build and apply</p>
              </div>
              <div className="command-card">
                <code>kubectl apply -k kustomize/prod</code>
                <p>Apply with kubectl (has kustomize built-in)</p>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section id="troubleshooting" className="docs-section">
            <h2>🔧 Troubleshooting Guide</h2>

            <div className="troubleshoot-card">
              <h3>❌ Pods not starting</h3>
              {this.renderCodeBlock(`# Check pod status
kubectl get pods -n production

# Look for errors
kubectl describe pod <pod-name> -n production

# Check logs
kubectl logs <pod-name> -n production`, null, "troubleshoot-pods")}
              <p>
                <strong>Common issues:</strong>
              </p>
              <ul>
                <li>
                  <code>ImagePullBackOff</code>: Can't pull Docker image (check path/permissions)
                </li>
                <li>
                  <code>CrashLoopBackOff</code>: Container crashes on start (check logs)
                </li>
                <li>
                  <code>Pending</code>: No resources available (check node capacity)
                </li>
              </ul>
            </div>

            <div className="troubleshoot-card">
              <h3>❌ Selector Immutable Error</h3>
              {this.renderCodeBlock(`The Deployment "gcp-cicd" is invalid: 
spec.selector: Invalid value: field is immutable`, null, "troubleshoot-selector")}
              <p>
                <strong>Cause:</strong> You can't change <code>spec.selector.matchLabels</code> on an existing deployment.
              </p>
              <p>
                <strong>Solution:</strong> Delete and recreate the deployment, or keep original selector labels.
              </p>
            </div>

            <div className="troubleshoot-card">
              <h3>❌ Certificate Not Ready</h3>
              {this.renderCodeBlock(`kubectl get managedcertificate -n production`, null, "troubleshoot-cert")}
              <p>
                If status is not <code>Active</code>:
              </p>
              <ul>
                <li>Verify DNS points to Ingress IP</li>
                <li>Wait 10-30 minutes for provisioning</li>
                <li>Check domain is publicly accessible</li>
              </ul>
            </div>

            <div className="troubleshoot-card">
              <h3>❌ 502 Bad Gateway</h3>
              <ul>
                <li>
                  Check if pods are running: <code>kubectl get pods -n production</code>
                </li>
                <li>
                  Check service endpoints: <code>kubectl get endpoints gcp-cicd -n production</code>
                </li>
                <li>Check backend health in Google Cloud Console</li>
              </ul>
            </div>
          </section>

          {/* Footer */}
          <footer className="docs-footer">
            <p>📚 Additional Resources</p>
            <div className="resources-grid">
              <a href="https://kubernetes.io/docs/" target="_blank" rel="noopener noreferrer">
                Kubernetes Docs
              </a>
              <a href="https://kustomize.io/" target="_blank" rel="noopener noreferrer">
                Kustomize
              </a>
              <a href="https://docs.github.com/en/actions" target="_blank" rel="noopener noreferrer">
                GitHub Actions
              </a>
              <a href="https://cloud.google.com/kubernetes-engine/docs" target="_blank" rel="noopener noreferrer">
                GKE Docs
              </a>
            </div>
            <p className="footer-tagline">Happy Deploying! 🚀</p>
          </footer>
        </main>
      </div>
    );
  }
}

export default Documentation;
