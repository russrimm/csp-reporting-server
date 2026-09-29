targetScope = 'subscription'

@minLength(3)
@maxLength(40)
@description('Name prefix for every resource, e.g. "csp-reports-dev". The web app becomes app-<environmentName>, which must be globally unique.')
param environmentName string

@minLength(1)
@description('Azure region for all resources.')
param location string

@description('Client ID of the Entra ID app registration used by App Service Authentication.')
param authClientId string

@description('Optional tag values.')
param sessionId string = ''
param deployedBy string = ''
param createdAt string = utcNow()

var tags = {
  'app-onboard-skill': 'true'
  'app-onboard-session-id': sessionId
  'created-at': createdAt
  environment: environmentName
  'deployed-by': deployedBy
}

var resourceGroupName = 'rg-${environmentName}'
var appServicePlanName = 'asp-${environmentName}'
var webAppName = 'app-${environmentName}'
var logAnalyticsName = 'log-${environmentName}'
var appInsightsName = 'appi-${environmentName}'

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module appServicePlan './modules/app-service-plan.bicep' = {
  name: 'app-service-plan'
  scope: rg
  params: {
    location: location
    tags: tags
    planName: appServicePlanName
  }
}

module logAnalytics './modules/log-analytics.bicep' = {
  name: 'log-analytics'
  scope: rg
  params: {
    location: location
    tags: tags
    workspaceName: logAnalyticsName
  }
}

module appInsights './modules/application-insights.bicep' = {
  name: 'application-insights'
  scope: rg
  params: {
    location: location
    tags: tags
    componentName: appInsightsName
    workspaceResourceId: logAnalytics.outputs.workspaceId
  }
}

module appService './modules/app-service.bicep' = {
  name: 'app-service'
  scope: rg
  params: {
    location: location
    tags: tags
    appServicePlanId: appServicePlan.outputs.planId
    appServiceName: webAppName
    appInsightsConnectionString: appInsights.outputs.connectionString
    authClientId: authClientId
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
  }
}

output resourceGroupName string = rg.name
output webAppName string = appService.outputs.webAppName
output webAppDefaultHostName string = appService.outputs.defaultHostName
output appInsightsName string = appInsights.outputs.componentName
