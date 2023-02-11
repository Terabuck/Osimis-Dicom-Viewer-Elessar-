#ifndef ROUTE_TO_POLICY_CONVERTOR_H
#define ROUTE_TO_POLICY_CONVERTOR_H

#include <map>
#include <boost/function.hpp>
#include <boost/regex.hpp>
#include <boost/foreach.hpp>
#include <boost/lexical_cast.hpp>

#include "../ImageProcessingPolicy/IImageProcessingPolicy.h"

/** ImageProcessingRouteParser
 *
 * Instanciate any ImageProcessingPolicy based on a route string.
 * It provide the constructors arguments required by the instantiation using the string parsed with a regex.
 *
 * @Responsibility Instanciate ImageProcessingPolicy from a given route
 *
 */

class ImageProcessingRouteParser {
public:
  typedef boost::function<IImageProcessingPolicy* (boost::cmatch&)> FactoryFn_t;

  /** RegisterRoute<T>(const std::string& routeRegex)
   *
   * Register a policy for a given route regex.
   *
   **/
  template<typename T>
  inline void RegisterRoute(const std::string& routeRegex);

  /** RegisterRoute<T>(const std::string& routeRegex)
   *
   * Register a policy for a given route regex,
   * with a specified factory function for policy instantiation.
   *
   **/
  template<typename T>
  inline void RegisterRoute(const std::string& routeRegex, FactoryFn_t factoryFn);

  /** InstantiatePolicyFromRoute(const std::string& route)
   *
   * Instantiate a new policy from a given route.
   *
   **/
  inline IImageProcessingPolicy* InstantiatePolicyFromRoute(const std::string& route);

private:
  // Basic Factory Function
  // Can be overloaded using template specialization 
  template<typename T>
  static inline T* _Instantiate(boost::cmatch& regexpMatches) {
    return new T();
  }

  // the typedef is used to ensure BOOST_FOREACH work correctly
  // see http://stackoverflow.com/questions/2104208/is-it-possible-to-use-boostforeach-with-stdmap
  typedef std::map<boost::regex, FactoryFn_t> FactoryFnByRouteMap_t;
  FactoryFnByRouteMap_t factoryFnByRouteMap_;
};

template<typename T>
inline void ImageProcessingRouteParser::RegisterRoute(const std::string& routeRegex)
{
  return RegisterRoute<T>(routeRegex, &ImageProcessingRouteParser::_Instantiate<T>);
}

template<typename T>
inline void ImageProcessingRouteParser::RegisterRoute(const std::string& routeRegex, FactoryFn_t factoryFn)
{
  boost::regex regexp(routeRegex);

  factoryFnByRouteMap_.insert(std::make_pair(regexp, factoryFn));
}

inline IImageProcessingPolicy* ImageProcessingRouteParser::InstantiatePolicyFromRoute(const std::string& route)
{
  // iterate through registered policies
  BOOST_FOREACH(FactoryFnByRouteMap_t::value_type& policyFactoryPair, factoryFnByRouteMap_)
  {
    const boost::regex& regexp = policyFactoryPair.first;
    FactoryFn_t& factoryFn = policyFactoryPair.second;

    // check if a policy route regex match
    boost::cmatch matches;
    if (boost::regex_match(route.c_str(), matches, regexp)) {
      // if a policy has been found, return the policy instance
      return factoryFn(matches);
    }
  }

  // if no policy found, throw exception
  throw std::invalid_argument("policy not found");
}

#endif // ROUTE_TO_POLICY_CONVERTOR_H
