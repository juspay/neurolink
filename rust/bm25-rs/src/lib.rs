//! JS bindings for `src/lib/rag/retrieval/bm25Core.ts`: generated from the signatures in `port.rs` by rust-anything.
//! Regenerate with `rust-anything refresh` after changing them.

use napi_derive::napi;

pub mod js;
pub mod port;
pub mod utf16;

fn panic_message(payload: &(dyn std::any::Any + Send)) -> String {
    payload
        .downcast_ref::<&str>()
        .map(|s| (*s).to_string())
        .or_else(|| payload.downcast_ref::<String>().cloned())
        .unwrap_or_else(|| "unknown panic".into())
}

#[allow(dead_code)]
fn run<T>(f: impl FnOnce() -> Result<T, String>) -> napi::Result<T> {
    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(f)) {
        Ok(result) => result.map_err(napi::Error::from_reason),
        Err(payload) => Err(napi::Error::from_reason(format!(
            "Rust panic: {}",
            panic_message(&*payload)
        ))),
    }
}

/// Class `BM25Core`.
#[napi(js_name = "BM25Core")]
pub struct BM25Core {
    inner: port::BM25Core,
}

#[napi]
impl BM25Core {
    #[napi(constructor)]
    pub fn new() -> napi::Result<Self> {
        run(move || {
            let out = port::BM25Core::new()?;
            Ok(Self { inner: out })
        })
    }

    #[napi(js_name = "add")]
    pub fn add(&mut self, ids: Vec<String>, texts: Vec<String>) -> napi::Result<()> {
        let inner = &mut self.inner;
        run(move || {
            inner.add(ids, texts)?;
            Ok(())
        })
    }

    #[napi(js_name = "search")]
    pub fn search(&mut self, query: String, limit: f64) -> napi::Result<String> {
        let inner = &mut self.inner;
        run(move || {
            let out = inner.search(query, limit)?;
            crate::js::to_json(&out)
        })
    }

    #[napi(js_name = "size")]
    pub fn size(&mut self) -> napi::Result<f64> {
        let inner = &mut self.inner;
        run(move || {
            let out = inner.size()?;
            Ok(out)
        })
    }
}
