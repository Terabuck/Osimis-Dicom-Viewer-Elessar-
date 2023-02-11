#if BENCHMARK == 1

#include "BenchmarkHelper.h"
#include <boost/chrono.hpp>

Benchmark::Benchmark(const std::string& name) : _name(name), _start(boost::chrono::high_resolution_clock::now()) {

}

Benchmark::~Benchmark() {
    boost::chrono::high_resolution_clock::time_point end = boost::chrono::high_resolution_clock::now();

    std::cout << "BENCH: " << this->_name << " " << boost::chrono::duration_cast<boost::chrono::milliseconds>(end - _start).count() << std::endl;
}

#endif
