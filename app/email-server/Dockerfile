# Use golang 1.24 alpine image for building
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git for go modules
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY main.go ./

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o guerrilla-mail .

# Final stage
FROM alpine:latest

# Install netcat for healthcheck
RUN apk --no-cache add ca-certificates netcat-openbsd

# Create non-root user and directory first
RUN adduser -D -s /bin/sh mailuser
RUN mkdir -p /app && chown mailuser:mailuser /app

WORKDIR /app

# Copy the binary and make it executable
COPY --from=builder /app/guerrilla-mail .
RUN chmod +x ./guerrilla-mail && chown mailuser:mailuser ./guerrilla-mail

EXPOSE 25 587

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD nc -z localhost 25 || exit 1

USER mailuser
CMD ["./guerrilla-mail"]