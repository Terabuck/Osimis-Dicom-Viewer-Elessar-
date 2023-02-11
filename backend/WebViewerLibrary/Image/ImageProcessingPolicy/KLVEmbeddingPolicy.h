#ifndef KLV_EMBEDDING_POLICY_H
#define KLV_EMBEDDING_POLICY_H

#include "IImageProcessingPolicy.h"

class KLVEmbeddingPolicy : public IImageProcessingPolicy {
public:
  virtual std::auto_ptr<IImageContainer> Apply(std::auto_ptr<IImageContainer> data, ImageMetaData* metaData);

  virtual std::string ToString() const 
  { 
    return "klv";
  }
};

#endif // KLV_EMBEDDING_POLICY_H