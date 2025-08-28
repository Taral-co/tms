job "guerrilla-mail" {
  datacenters = ["dc1"]
  type        = "service"

  group "guerrilla-mail-falkenstein" {
    count = 1  # High availability with 2 replicas

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
      port "smtp" {
        static = 25
      }
      port "submission" {
        static = 587
      }
    }

    volume "mail_storage" {
      type      = "host"
      read_only = false
      source    = "mail_storage"
    }
    
    service {
      name = "guerrilla-mail"
      port = "smtp"
      
      # Health checks
      check {
        type     = "tcp"
        port     = "smtp"
        interval = "30s"
        timeout  = "10s"
        
        check_restart {
          limit = 3
          grace = "30s"
          ignore_warnings = false
        }
      }
      
      # Additional health check for submission port
      check {
        name     = "submission-port"
        type     = "tcp"
        port     = "submission"
        interval = "30s"
        timeout  = "10s"
      }
      
      # Traefik service discovery tags for mail routing
      tags = [
        "traefik.enable=true",
        
        # TCP router for SMTP (port 25)
        "traefik.tcp.routers.smtp.rule=HostSNI(`*`)",
        "traefik.tcp.routers.smtp.entrypoints=smtp",
        "traefik.tcp.routers.smtp.service=guerrilla-mail-smtp",
        "traefik.tcp.services.guerrilla-mail-smtp.loadbalancer.server.port=${NOMAD_PORT_smtp}",
        
        # TCP router for submission port (587)
        "traefik.tcp.routers.submission.rule=HostSNI(`*`)",
        "traefik.tcp.routers.submission.entrypoints=submission",
        "traefik.tcp.routers.submission.service=guerrilla-mail-submission",
        "traefik.tcp.services.guerrilla-mail-submission.loadbalancer.server.port=${NOMAD_PORT_submission}",
        
        "region=falkenstein",
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
    update {
      max_parallel      = 1
      min_healthy_time  = "30s"
      healthy_deadline  = "3m"
      progress_deadline = "10m"
      auto_revert       = true
      auto_promote      = true
      canary            = 1
      stagger           = "5s"
    }
    
    # Placement preferences for load distribution
    affinity {
      attribute = "${node.unique.id}"
      operator  = "regexp"
      value     = ".*"
      weight    = 50
    }
    
    task "guerrilla-mail" {
      driver = "docker"

      volume_mount {
        volume      = "mail_storage"
        destination = "/var/mail"
        read_only   = false
      }
      
      # Enable Vault workload identity
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
      
      # Mail server configuration from Vault
      template {
        data = <<EOH
{{- with secret "secret/data/tms/config" -}}
MAIL_DOMAIN={{ .Data.data.MAIL_DOMAIN }}
MAX_MESSAGE_SIZE={{ .Data.data.MAX_MESSAGE_SIZE | default "1048576" }}
{{- end }}
EOH
        destination = "secrets/mail.env"
        env         = true
        change_mode = "restart"
      }
      
      # Backend API configuration from Vault
      template {
        data = <<EOH
TICKET_API_URL=http://{{- range $i, $service := service "backend" -}}{{- if eq $i 0 }}{{ .Address }}:{{ .Port }}{{- end }}{{- end }}/v1/public/email-to-ticket
EOH
        destination = "secrets/api.env"
        env         = true
        change_mode = "restart"
      }
      
      # GitHub configuration for Docker authentication
      template {
        data = <<EOH
{{- with secret "secret/data/shared/githubAuth " -}}
GHC_TOKEN={{ .Data.data.GHC_TOKEN }}
GITHUB_USERNAME={{ .Data.data.GITHUB_USERNAME }}
{{- end }}
EOH
        destination = "secrets/github.env"
        env         = true
        change_mode = "restart"
      }
      
      # Consul service discovery configuration
      template {
        data = <<EOH
CONSUL_HTTP_ADDR=http://{{ env "NOMAD_IP_smtp" }}:8500
SERVICE_NAME=guerrilla-mail
SERVICE_ID=guerrilla-mail-{{ env "NOMAD_ALLOC_ID" }}
SERVICE_PORT={{ env "NOMAD_PORT_smtp" }}
EOH
        destination = "secrets/consul.env"
        env         = true
        change_mode = "restart"
      }
      
      config {
        image = "ghcr.io/bareuptime/guerrilla-mail:latest"
        ports = ["smtp", "submission"]
        
        # Docker authentication for private registry
        auth {
          username = "${GITHUB_USERNAME}" 
          password = "${GHC_TOKEN}"
          server_address = "ghcr.io"
        }
        
        # Force pull latest image
        force_pull = true
        
        # Wait for backend service to be available
        command = "/bin/sh"
        args = [
          "-c",
          <<EOF
echo 'Waiting for backend service...' &&
until nc -z $(echo $TICKET_API_URL | cut -d'/' -f3 | cut -d':' -f1) $(echo $TICKET_API_URL | cut -d'/' -f3 | cut -d':' -f2); do
  echo 'Waiting for backend API connection...';
  sleep 2;
done &&
echo 'Backend API is ready' &&
echo 'Starting Guerrilla Mail server...' &&
exec /app/guerrilla-mail
EOF
        ]
      }
      
      # Performance optimizations
      env {
        LISTEN_INTERFACE = "0.0.0.0:25"
        GOMAXPROCS = "1"
        GOGC = "100"
        GOMEMLIMIT = "200MiB"
        REGION = "${meta.region}"
      }
      
      # Resource allocation matching Docker Swarm config
      resources {
        cpu    = 100   # 0.1 CPU (similar to 0.25 limit in compose)
        memory = 200   # 256MB limit from compose, 128MB reservation
      }
      
      # Logs configuration
      logs {
        max_files     = 10
        max_file_size = 15
      }
    }
  }
}
