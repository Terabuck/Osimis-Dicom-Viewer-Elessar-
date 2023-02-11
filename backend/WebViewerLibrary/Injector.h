#ifndef INJECTOR_H
#define INJECTOR_H

// @todo variadic Template
/** Injector 
 *
 * @Usage class YourClass
 *        : public Injector<ImageRepository>
 *
 */
class Injector {
protected:
  template<typename T>
  void Inject(T* injection) {

  }

  template<typename T>
  T* GetInjection() {
    return 0;
  }

private:

};

#endif // INJECTOR_H