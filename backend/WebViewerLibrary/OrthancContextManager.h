#ifndef ORHTANC_CONTEXT_MANAGER_H
#define ORHTANC_CONTEXT_MANAGER_H

#include <orthanc/OrthancCPlugin.h>

class OrthancContextManager {
public:
  static void Set(OrthancPluginContext* context);
  static OrthancPluginContext* Get();

private:
  OrthancContextManager();
  ~OrthancContextManager();

  static OrthancPluginContext* context_;
};

#endif // ORHTANC_CONTEXT_MANAGER_H
