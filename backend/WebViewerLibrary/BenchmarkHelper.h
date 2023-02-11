#ifndef BENCHMARKHELPER_H
#define BENCHMARKHELPER_H

#if BENCHMARK == 1
#define BENCH(NAME) Benchmark __b__##NAME(#NAME);
#define BENCH_LOG(NAME, DATA) Benchmark::log(#NAME, (DATA));
#else
#define BENCH(NAME) ;
#define BENCH_LOG(NAME, data) ;
#endif

#if BENCHMARK == 1

#include <boost/chrono/chrono.hpp>
#include <iostream>

class Benchmark
{
public:
    Benchmark(const std::string& name);
    ~Benchmark();

    template <typename T>
    static void log(const std::string& name, T data) {
        std::cout << "BENCH: [" << name << "] " << data << std::endl;
    }

private:
    const std::string _name;
    boost::chrono::high_resolution_clock::time_point _start;
};
#endif

#endif // BENCHMARKHELPER_H
