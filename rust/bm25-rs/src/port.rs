//! The Rust port of `src/lib/rag/retrieval/bm25Core.ts`.
//!
//! A faithful port: the same algorithm, the same order of floating-point
//! operations and the same tie order as the TypeScript, so `rust-anything diff`
//! can demand identical output. It deliberately keeps the TypeScript's linear
//! scans (no inverted index), so a benchmark compares languages, not algorithms.

#![forbid(unsafe_code)]

use std::collections::HashMap;

// Declared here, not in the generated lib.rs, so `rust-anything refresh` keeps it.
#[path = "fdlibm.rs"]
mod fdlibm;

const K1: f64 = 1.5;
const B: f64 = 0.75;

/// Port of class `BM25Core` (`src/lib/rag/retrieval/bm25Core.ts:12`): holds the instance state.
pub struct BM25Core {
    ids: Vec<String>,
    positions: HashMap<String, usize>,
    tokens: Vec<Vec<String>>,
    avg_doc_length: f64,
}

/// JS `text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(t => t.length > 0)`.
///
/// After the replace, every character outside ASCII `[A-Za-z0-9_]` is either
/// JS whitespace or a space, so the tokens are exactly the runs of ASCII word
/// characters in the lowercased text. Lowercasing comes first because a few
/// characters lowercase into ASCII ('İ' to "i" plus a combining dot, the Kelvin
/// sign to 'k'), and Rust's `to_lowercase` applies the same Unicode mappings.
fn tokenize(text: &str) -> Vec<String> {
    text.to_lowercase()
        .split(|c: char| !(c.is_ascii_alphanumeric() || c == '_'))
        .filter(|t| !t.is_empty())
        .map(str::to_owned)
        .collect()
}

impl BM25Core {
    /// Port of `BM25Core` constructor (`src/lib/rag/retrieval/bm25Core.ts:12`).
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            ids: Vec::new(),
            positions: HashMap::new(),
            tokens: Vec::new(),
            avg_doc_length: 0.0,
        })
    }

    /// Port of `BM25Core.add` (`src/lib/rag/retrieval/bm25Core.ts:22`).
    pub fn add(&mut self, ids: Vec<String>, texts: Vec<String>) -> Result<(), String> {
        for (i, id) in ids.into_iter().enumerate() {
            // JS reads `texts[i]` as undefined past the end and throws in
            // toLowerCase; report the same failure instead of panicking.
            let text = texts.get(i).ok_or_else(|| {
                "Cannot read properties of undefined (reading 'toLowerCase')".to_owned()
            })?;
            let doc_tokens = tokenize(text);
            match self.positions.get(&id) {
                Some(&position) => self.tokens[position] = doc_tokens,
                None => {
                    self.positions.insert(id.clone(), self.ids.len());
                    self.ids.push(id);
                    self.tokens.push(doc_tokens);
                }
            }
        }

        let total_length: usize = self.tokens.iter().map(Vec::len).sum();
        self.avg_doc_length = if self.tokens.is_empty() {
            0.0
        } else {
            total_length as f64 / self.tokens.len() as f64
        };
        Ok(())
    }

    /// Port of `BM25Core.search` (`src/lib/rag/retrieval/bm25Core.ts:48`).
    pub fn search(&mut self, query: String, limit: f64) -> Result<serde_json::Value, String> {
        let query_tokens = tokenize(&query);
        if query_tokens.is_empty() || self.ids.is_empty() {
            return Ok(serde_json::json!({ "ids": [], "scores": [] }));
        }

        let doc_total = self.ids.len() as f64;
        let mut idf_values: HashMap<&str, f64> = HashMap::new();
        for token in &query_tokens {
            let doc_count = self
                .tokens
                .iter()
                .filter(|doc| doc.iter().any(|t| t == token))
                .count() as f64;
            // fdlibm's log, as V8's Math.log, not the platform's `ln`.
            idf_values.insert(
                token.as_str(),
                fdlibm::log((doc_total - doc_count + 0.5) / (doc_count + 0.5) + 1.0),
            );
        }

        let mut hits: Vec<(usize, f64)> = Vec::new();
        for (position, doc_tokens) in self.tokens.iter().enumerate() {
            let doc_length = doc_tokens.len() as f64;
            let mut score = 0.0_f64;
            for token in &query_tokens {
                let tf = doc_tokens.iter().filter(|t| *t == token).count() as f64;
                let idf = idf_values.get(token.as_str()).copied().unwrap_or(0.0);
                let numerator = tf * (K1 + 1.0);
                let denominator = tf + K1 * (1.0 - B + B * (doc_length / self.avg_doc_length));
                score += idf * (numerator / denominator);
            }
            if score > 0.0 {
                hits.push((position, score));
            }
        }

        // JS sorts stably by `b.score - a.score`; every kept score is a finite
        // positive number, so `total_cmp` orders them the same way.
        hits.sort_by(|a, b| b.1.total_cmp(&a.1));
        // JS: `limit < 0 ? hits : hits.slice(0, limit)`. NaN is not below
        // zero and slices to nothing; `NaN as usize` is 0, and a fraction
        // truncates the way slice truncates it.
        if limit.is_nan() || limit >= 0.0 {
            hits.truncate(limit as usize);
        }

        let ids: Vec<&str> = hits.iter().map(|&(p, _)| self.ids[p].as_str()).collect();
        let scores: Vec<f64> = hits.iter().map(|&(_, s)| s).collect();
        Ok(serde_json::json!({ "ids": ids, "scores": scores }))
    }

    /// Port of `BM25Core.size` (`src/lib/rag/retrieval/bm25Core.ts:99`).
    pub fn size(&mut self) -> Result<f64, String> {
        Ok(self.ids.len() as f64)
    }
}
