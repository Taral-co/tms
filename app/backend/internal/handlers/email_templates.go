package handlers

import (
	"bytes"
	"fmt"
	"html/template"
	"path/filepath"
	texttemplate "text/template"
)

// TemplateData represents data passed to email templates
type TemplateData struct {
	OTP string
}

// loadTemplate loads and executes an email template
func loadHTMLTemplate(templateName string, data TemplateData) (string, error) {
	templatePath := filepath.Join("templates", templateName)
	
	tmpl, err := template.ParseFiles(templatePath)
	if err != nil {
		return "", fmt.Errorf("failed to parse HTML template %s: %w", templatePath, err)
	}
	
	var buf bytes.Buffer
	err = tmpl.Execute(&buf, data)
	if err != nil {
		return "", fmt.Errorf("failed to execute HTML template %s: %w", templatePath, err)
	}
	
	return buf.String(), nil
}

// loadTextTemplate loads and executes a text email template
func loadTextTemplate(templateName string, data TemplateData) (string, error) {
	templatePath := filepath.Join("templates", templateName)
	
	tmpl, err := texttemplate.ParseFiles(templatePath)
	if err != nil {
		return "", fmt.Errorf("failed to parse text template %s: %w", templatePath, err)
	}
	
	var buf bytes.Buffer
	err = tmpl.Execute(&buf, data)
	if err != nil {
		return "", fmt.Errorf("failed to execute text template %s: %w", templatePath, err)
	}
	
	return buf.String(), nil
}
