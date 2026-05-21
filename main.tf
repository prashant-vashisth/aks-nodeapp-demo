# AKS Policy Configuration — Humana Platform Engineering
# IDA Grade target: A

resource "azurerm_kubernetes_cluster" "humana_aks" {
  name                = "humana-prod-aks-eastus"
  location            = "East US"
  resource_group_name = "humana-prod-rg"
  dns_prefix          = "humana-prod"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_DS2_v2"
  }

  tags = {
    Environment = "production"
    CostCenter  = "HUM-INFRA-001"
    Owner       = "platform-engineering@humana.com"
    Compliance  = "HIPAA"
  }
}
