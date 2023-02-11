#include "OrthancContextManager.h"

OrthancPluginContext* OrthancContextManager::context_ = NULL;

void OrthancContextManager::Set(OrthancPluginContext* context) {
  OrthancContextManager::context_ = context;
}

OrthancPluginContext* OrthancContextManager::Get() {
  return OrthancContextManager::context_;
}
