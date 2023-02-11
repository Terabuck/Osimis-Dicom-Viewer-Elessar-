#include "CompositePolicy.h"

#include <boost/foreach.hpp>
#include "../../Logging.h"

CompositePolicy::~CompositePolicy()
{
  BOOST_FOREACH(IImageProcessingPolicy* policy, policyChain_)
  {
    delete policy;
  }
}

 
std::auto_ptr<IImageContainer> CompositePolicy::Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData)
{
  OrthancPluginLogDebug(OrthancContextManager::Get(), "ImageProcessingPolicy: CompositePolicy");
  std::auto_ptr<IImageContainer> output = input; // note input == NULL after the copy

  BOOST_FOREACH(IImageProcessingPolicy* policy, policyChain_)
  {
    assert(output.get() != NULL);
    output = policy->Apply(output, metaData);
    assert(output.get() != NULL);
  }

  return output;
}

void CompositePolicy::AddPolicy(IImageProcessingPolicy* policy)
{
  policyChain_.push_back(policy);
}