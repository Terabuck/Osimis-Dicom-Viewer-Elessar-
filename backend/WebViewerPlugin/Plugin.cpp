/**
 * Orthanc - A Lightweight, RESTful DICOM Store
 * Copyright (C) 2012-2016 Sebastien Jodogne, Medical Physics
 * Department, University Hospital of Liege, Belgium
 *
 * This program is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 **/

#include <orthanc/OrthancCPlugin.h>
#include "WebViewer.h"
#include "Core/OrthancException.h"

WebViewer* _webViewer;

extern "C"
{
  ORTHANC_PLUGINS_API int32_t OrthancPluginInitialize(OrthancPluginContext* context)
  {
    try
    {
      _webViewer = new WebViewer(context);

      return _webViewer->start();
    }
    catch (Orthanc::OrthancException& e)
    {
      OrthancPluginLogError(context, ("Error while initializing the WebViewer plugin: " + std::string(e.What())).c_str());
      return -1;
    }
    // catch (std::runtime_error& e)
    // {
    //   OrthancPluginLogError(context, ("Error while initializing the WebViewer plugin: " + std::string(e.what())).c_str());
    //   return -2;
    // }
    catch (...)
    {
      OrthancPluginLogError(context, "Unexpected error while initializing the WebViewer plugin");
      return -3;
    }
  }


  ORTHANC_PLUGINS_API void OrthancPluginFinalize()
  {
    delete _webViewer;
  }


  ORTHANC_PLUGINS_API const char* OrthancPluginGetName()
  {
    return WebViewer::getName().c_str(); // static methods to retrieve name since _webViewer is not initialized yet
  }


  ORTHANC_PLUGINS_API const char* OrthancPluginGetVersion()
  {
    return WebViewer::getVersion().c_str(); // static methods to retrieve version since _webViewer is not initialized yet
  }
}
