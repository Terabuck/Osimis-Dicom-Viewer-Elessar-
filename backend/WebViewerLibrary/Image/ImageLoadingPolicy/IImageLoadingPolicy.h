#pragma once

class IImageLoadingPolicy {
public:
  virtual ~IImageLoadingPolicy();

  virtual void LoadImage() = 0;
};