#pragma once

#include <string>
#include <boost/noncopyable.hpp>

#include "../BaseController.h"

class AnnotationRepository;

// .../studies/<study_id>/annotations

class StudyController : public BaseController, public boost::noncopyable {
public:
  StudyController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request);

  template<typename T>
  static void Inject(T* obj);

protected:
  virtual int _ParseURLPostFix(const std::string& urlPostfix);
  virtual int _ProcessRequest();

private:
  static AnnotationRepository* annotationRepository_;

  std::string studyId_;
  bool isAnnotationRequest_;

  int ProcessAnnotationRequest(OrthancPluginContext* context);
  int ProcessStudyInfoRequest(OrthancPluginContext* context);
};
