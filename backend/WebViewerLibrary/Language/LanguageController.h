#pragma once

#include <string>
#include <map>
#include <vector>
#include <boost/noncopyable.hpp>

#include "../BaseController.h"

// .../languages/<language_id>

class LanguageController : public BaseController, public boost::noncopyable {
public:
  LanguageController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request);

  static void addLanguageFile(const std::string& languageId, const std::string& languageFile);

protected:
  virtual int _ParseURLPostFix(const std::string& urlPostfix);
  virtual int _ProcessRequest();

private:
  typedef std::vector<std::string> LanguageFilesList;
  typedef std::map<std::string, LanguageFilesList> LanguageFilesMap;
  static LanguageFilesMap languageFiles_; // i.e: "en" -> ["en.json", "en-pro.json"]
  std::string languageId_;
};
