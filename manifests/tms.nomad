job "tms-backend" {
  datacenters = ["dc1"]
  type        = "service"

  group "tms-falkenstein" {
    count = 3  # High availability with 5 replicas

    # Spread across different nodes for better distribution
    # spread {
    #   attribute = "${meta.region}"
    #   target "falkenstein" {
    #     percent = 60
    #   }
    #   target "iowa" {
    #     percent = 40
    #   } 
    # }
    
    constraint {
      attribute = "${attr.kernel.name}"
      value     = "linux"
    }

    constraint {
      attribute = "${meta.region}"
      value     = "falkenstein"
    }
    
    network {
      mode = "bridge"
      port "http" {
      }
    }

    volume "backend_storage" {
      type      = "host"
      read_only = false
      source    = "backend_storage"
    }
    
    service {
      name = "backend"
      port = "http"
      
      # Health checks
      # check {
      #   type     = "http"
      #   path     = "/health"
      #   interval = "60s"
      #   timeout  = "10s"
        
      #   check_restart {
      #     limit = 3
      #     grace = "30s"
      #     ignore_warnings = false
      #   }
      # }
      
      # Traefik service discovery tags
      tags = [
        "traefik.enable=true",
        
        # Main API routes for api.bareuptime.co (highest priority)
        "traefik.http.routers.backend-api.rule=Host(`tms.bareuptime.co`)",
        "traefik.http.routers.backend-api.entrypoints=websecure",
        "traefik.http.routers.backend-api.tls=true",
        "traefik.http.routers.backend-api.tls.certresolver=letsencrypt",
        "traefik.http.routers.backend-api.tls.domains[0].main=tms.bareuptime.co",
        "traefik.http.routers.backend-api.service=backend",
        "traefik.http.routers.backend-api.middlewares=client-ip",
        "traefik.http.routers.backend-api.priority=100",
        "region=falkenstein",  # or "iowa"

        
        
        # Service configuration with load balancing
        "traefik.http.services.backend.loadbalancer.server.port=${NOMAD_PORT_http}",
        "traefik.http.services.backend.loadbalancer.healthcheck.path=/health",
        "traefik.http.services.backend.loadbalancer.healthcheck.interval=30s",
        "traefik.http.services.backend.loadbalancer.healthcheck.timeout=10s",
        "traefik.http.services.backend.loadbalancer.sticky.cookie=true",
        
        # Security headers middleware
        "traefik.http.middlewares.security-headers.headers.frameDeny=true",
        "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true",
        "traefik.http.middlewares.security-headers.headers.browserXssFilter=true",
        "traefik.http.middlewares.security-headers.headers.referrerPolicy=strict-origin-when-cross-origin",
        "traefik.http.middlewares.security-headers.headers.stsSeconds=31536000",
        "traefik.http.middlewares.security-headers.headers.stsIncludeSubdomains=true",
        "traefik.http.middlewares.security-headers.headers.stsPreload=true",
        
        # Rate limiting middleware (general)
        "traefik.http.middlewares.rate-limit.ratelimit.average=200",
        "traefik.http.middlewares.rate-limit.ratelimit.burst=400",
        "traefik.http.middlewares.rate-limit.ratelimit.period=1m",
        
        # API-specific rate limiting
        "traefik.http.middlewares.api-rate-limit.ratelimit.average=100",
        "traefik.http.middlewares.api-rate-limit.ratelimit.burst=200",
        "traefik.http.middlewares.api-rate-limit.ratelimit.period=1m",
        
        # CORS headers for API
        "traefik.http.middlewares.cors-headers.headers.accesscontrolallowmethods=GET,OPTIONS,PUT,POST,DELETE",
        "traefik.http.middlewares.cors-headers.headers.accesscontrolalloworiginlist=https://*.bareuptime.co,https://bareuptime.co",
        "traefik.http.middlewares.cors-headers.headers.accesscontrolallowheaders=Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With",
        "traefik.http.middlewares.cors-headers.headers.accesscontrolmaxage=86400",
        "traefik.http.middlewares.cors-headers.headers.addvaryheader=true",
        
        # Client IP middleware
        "traefik.http.middlewares.client-ip.ipwhitelist.sourcerange=0.0.0.0/0",
      ]
    }
    
    # Restart policy for resilience
    restart {
      attempts = 5
      interval = "2m"
      delay    = "3s"
      mode     = "fail"
    }
    
    # Rolling update configuration
    # update {
    #   max_parallel      = 1
    #   min_healthy_time  = "30s"
    #   healthy_deadline  = "3m"
    #   progress_deadline = "10m"
    #   auto_revert       = true
    #   auto_promote      = true
    #   canary            = 1
    #   stagger           = "5s"
    # }
    
    # Placement preferences for load distribution
    # affinity {
    #   attribute = "${node.unique.id}"
    #   operator  = "regexp"
    #   value     = ".*"
    #   weight    = 50
    # }
    
    task "backend" {
      driver = "docker"

      volume_mount {
        volume      = "backend_storage"
        destination = "/opt/tms"
        read_only   = false
      }
      
      # Enable Vault workload identity
      # identity {
      #   aud = ["vault.io"]
      #   env = true
      #   file = true
      #   change_mode = "restart"
      # }

      vault {
        policies = ["nomad-cluster"]
      }
      
      template {
        data = <<EOH
REGION_TAG=region={{ env "meta.region" }}
EOH
        destination = "secrets/region.env"
        env         = true
        change_mode = "restart"
      }
      # Database configuration from Vault
      template {
        data = <<EOH
{{- with secret "secret/data/bareuptime/database" -}}
DATABASE_URL=postgresql://{{ .Data.data.POSTGRES_USER }}:{{ .Data.data.POSTGRES_PASSWORD }}@10.10.85.1:5432/tms?sslmode=disable
{{- end }}
EOH
        destination = "secrets/database.env"
        env         = true
        change_mode = "restart"
      }
      
      # Redis configuration from Vault - Sentinel mode
      template {
        data = <<EOH
{{- with secret "secret/data/shared/redis" -}}
REDIS_PASSWORD={{ .Data.data.REDIS_PASSWORD }}
REDIS_MASTER_NAME=mymaster
# Sentinel endpoints (comma-separated)
REDIS_SENTINELS={{- range $i, $service := service "redis-sentinel" -}}{{- if $i }},{{ end }}{{ .Address }}:{{ .Port }}{{- end }}
{{- end }}
EOH
        destination = "secrets/redis.env"
        env         = true
        change_mode = "restart"
      }
      
      # API keys and secrets from Vault
      template {
        data = <<EOH
{{- with secret "secret/data/shared/githubAuth" -}}
GHC_TOKEN={{ .Data.data.GHC_TOKEN }}
GITHUB_USERNAME={{ .Data.data.GITHUB_USERNAME }}
{{- end }}
EOH
        destination = "secrets/github.env"
        env         = true
        change_mode = "restart"
      }
      
      # Application configuration from Vault
      template {
        data = <<EOH
{{- with secret "secret/data/tms/config" -}}
APP_ENV={{ .Data.data.APP_ENV }}
APP_NAME={{ .Data.data.APP_NAME }}
LOG_LEVEL={{ .Data.data.LOG_LEVEL }}
DEFAULT_LANG={{ .Data.data.DEFAULT_LANG }}
PORT=8080
OTP_EXPIRY_MINUTES={{ .Data.data.OTP_EXPIRY_MINUTES }}
OTP_SECRET_KEY={{ .Data.data.OTP_SECRET_KEY }}
EMAIL_FROM_ADDRESS={{ .Data.data.EMAIL_FROM_ADDRESS }}
EMAIL_FROM_NAME={{ .Data.data.EMAIL_FROM_NAME }}
EMAIL_REPLY_TO_ADDRESS={{ .Data.data.EMAIL_REPLY_TO_ADDRESS }}
RESEND_API_KEY={{ .Data.data.RESEND_API_KEY }}
{{- end }}
EOH
        destination = "secrets/config.env"
        env         = true
        change_mode = "restart"
      }
      
      # Consul service discovery configuration
      template {
        data = <<EOH
CONSUL_HTTP_ADDR=http://{{ env "NOMAD_IP_http" }}:8500
SERVICE_NAME=backend
SERVICE_ID=backend-{{ env "NOMAD_ALLOC_ID" }}
SERVICE_PORT={{ env "NOMAD_PORT_http" }}
EOH
        destination = "secrets/consul.env"
        env         = true
        change_mode = "restart"
      }
      
      config {
        image = "ghcr.io/taral-co/tms/tms-backend:latest"
        ports = ["http"]
        
        # Docker authentication for private registry
        auth {
          username = "${GITHUB_USERNAME}" 
          password = "${GHC_TOKEN}"
          server_address = "ghcr.io"
        }
        
        # Force pull latest image
        force_pull = true
        
        # Wait for database to be ready
        command = "/bin/sh"
        args = [
          "-c",
          <<EOF
echo 'Waiting for database...' &&
until nc -z 10.10.85.1 5432; do
  echo 'Waiting for database connection...';
  sleep 2;
done &&
echo 'Database is ready' &&
echo 'Starting Backend service...' &&
sleep 1000 &&  # Ensure PostgreSQL replica is fully initialized
exec /root/tms-backend
EOF
        ]
      }
      
      # Performance optimizations
      env {
        GOMAXPROCS = "2"
        GOGC = "100"
        GOMEMLIMIT = "450MiB"
        REGION = "${meta.region}"  # or "iowa"
      }
      
      # Resource allocation matching Docker Swarm config
      resources {
        cpu    = 150   # 0.15 CPU
        memory = 365   # 512MB
      }
      
      # Logs configuration
      logs {
        max_files     = 10
        max_file_size = 15
      }
    }
  }
}