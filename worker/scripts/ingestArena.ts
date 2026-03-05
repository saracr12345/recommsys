    //worker/scripts/ingestArena.ts
    /// <reference types="node" />

    import { ingestBenchmarks } from '../src/services/benchmarks/ingest'

    ingestBenchmarks()
    .then((res) => {
        console.log(JSON.stringify(res, null, 2))
        process.exit(0)
    })
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })