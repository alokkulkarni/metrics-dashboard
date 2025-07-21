{{/*
Expand the name of the chart.
*/}}
{{- define "metrics-dashboard.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "metrics-dashboard.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "metrics-dashboard.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "metrics-dashboard.labels" -}}
helm.sh/chart: {{ include "metrics-dashboard.chart" . }}
{{ include "metrics-dashboard.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: application
{{- with .Values.labels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "metrics-dashboard.selectorLabels" -}}
app.kubernetes.io/name: {{ include "metrics-dashboard.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app: {{ include "metrics-dashboard.name" . }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "metrics-dashboard.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "metrics-dashboard.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Frontend image
*/}}
{{- define "metrics-dashboard.frontend.image" -}}
{{- $registry := .Values.global.imageRegistry | default "" -}}
{{- $repository := .Values.image.frontend.repository -}}
{{- $tag := .Values.image.frontend.tag | default .Chart.AppVersion -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- else -}}
{{- printf "%s:%s" $repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Backend image
*/}}
{{- define "metrics-dashboard.backend.image" -}}
{{- $registry := .Values.global.imageRegistry | default "" -}}
{{- $repository := .Values.image.backend.repository -}}
{{- $tag := .Values.image.backend.tag | default .Chart.AppVersion -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- else -}}
{{- printf "%s:%s" $repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Database connection string
*/}}
{{- define "metrics-dashboard.database.connectionString" -}}
{{- printf "postgresql://%s:$(DB_PASSWORD)@%s:%d/%s?sslmode=%s" .Values.azure.database.user .Values.azure.database.host (.Values.azure.database.port | int) .Values.azure.database.name .Values.azure.database.sslMode -}}
{{- end }}

{{/*
Azure Key Vault URL
*/}}
{{- define "metrics-dashboard.keyVault.url" -}}
{{- printf "https://%s.vault.azure.net/" .Values.azure.keyVault.name -}}
{{- end }}

{{/*
Pod anti-affinity rules
*/}}
{{- define "metrics-dashboard.podAntiAffinity" -}}
{{- if .Values.affinity.podAntiAffinity.enabled }}
{{- if eq .Values.affinity.podAntiAffinity.type "hard" }}
requiredDuringSchedulingIgnoredDuringExecution:
- labelSelector:
    matchExpressions:
    - key: app.kubernetes.io/name
      operator: In
      values:
      - {{ include "metrics-dashboard.name" . }}
    - key: app.kubernetes.io/instance
      operator: In
      values:
      - {{ .Release.Name }}
  topologyKey: kubernetes.io/hostname
{{- else }}
preferredDuringSchedulingIgnoredDuringExecution:
- weight: 100
  podAffinityTerm:
    labelSelector:
      matchExpressions:
      - key: app.kubernetes.io/name
        operator: In
        values:
        - {{ include "metrics-dashboard.name" . }}
      - key: app.kubernetes.io/instance
        operator: In
        values:
        - {{ .Release.Name }}
    topologyKey: kubernetes.io/hostname
{{- end }}
{{- end }}
{{- end }}

{{/*
Resource limits and requests
*/}}
{{- define "metrics-dashboard.frontend.resources" -}}
{{- if .Values.resources.frontend }}
resources:
  {{- toYaml .Values.resources.frontend | nindent 2 }}
{{- end }}
{{- end }}

{{- define "metrics-dashboard.backend.resources" -}}
{{- if .Values.resources.backend }}
resources:
  {{- toYaml .Values.resources.backend | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Security context
*/}}
{{- define "metrics-dashboard.podSecurityContext" -}}
{{- if .Values.security.podSecurityContext }}
securityContext:
  {{- toYaml .Values.security.podSecurityContext | nindent 2 }}
{{- end }}
{{- end }}

{{- define "metrics-dashboard.containerSecurityContext" -}}
{{- if .Values.security.containerSecurityContext }}
securityContext:
  {{- toYaml .Values.security.containerSecurityContext | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Ingress annotations
*/}}
{{- define "metrics-dashboard.ingress.annotations" -}}
{{- with .Values.ingress.annotations }}
{{- toYaml . }}
{{- end }}
{{- end }}

{{/*
Service annotations
*/}}
{{- define "metrics-dashboard.service.annotations" -}}
{{- with .Values.service.annotations }}
{{- toYaml . }}
{{- end }}
{{- end }}

{{/*
Pod annotations
*/}}
{{- define "metrics-dashboard.podAnnotations" -}}
{{- with .Values.podAnnotations }}
{{- toYaml . }}
{{- end }}
{{- with .Values.annotations }}
{{- toYaml . }}
{{- end }}
{{- end }}

{{/*
Image pull secrets
*/}}
{{- define "metrics-dashboard.imagePullSecrets" -}}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
- name: {{ . }}
{{- end }}
{{- end }}
{{- end }}
