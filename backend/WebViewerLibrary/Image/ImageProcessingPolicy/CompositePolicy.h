#ifndef COMPOSITE_POLICY_H
#define COMPOSITE_POLICY_H

#include <string>
#include <vector>
#include <algorithm>    // std::transform
#include <boost/algorithm/string/join.hpp>
#include <boost/bind.hpp>
//#include <boost/lambda/lambda.hpp>
#include "IImageProcessingPolicy.h"

class CompositePolicy : public IImageProcessingPolicy {
public:
  virtual ~CompositePolicy();
  virtual std::auto_ptr<IImageContainer> Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData);

  // takes ownership
  void AddPolicy(IImageProcessingPolicy* policy);
  
  virtual std::string ToString() const
  {
    std::vector<std::string> policyStrChain;
    policyStrChain.resize(policyChain_.size());

    std::transform(policyChain_.begin(), policyChain_.end(), policyStrChain.begin(), &CompositePolicy::ConvertPolicyToString);
    return boost::algorithm::join(policyStrChain, "~");
  }
public:
  std::vector<IImageProcessingPolicy*> policyChain_;
  static inline std::string ConvertPolicyToString(IImageProcessingPolicy* policy) { return policy->ToString(); }
};

#endif // COMPOSITE_POLICY_H
