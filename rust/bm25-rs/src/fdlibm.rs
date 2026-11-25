//! `log`, ported from fdlibm's `e_log.c`, the routine V8 uses for `Math.log`.
//!
//! Rust's `f64::ln` calls the platform's libm, which rounds some results one
//! unit in the last place away from V8. BM25 scores feed a sort, so the port
//! uses this copy to produce the same bits as JavaScript.
//!
//! V8 is built with clang, which fuses `a * b + c` inside one expression into
//! a single fused multiply-add wherever the target CPU has one (every arm64
//! CPU; a baseline x86-64 build has none). The fused and unfused forms round
//! differently, so `mul_add` below is fused on aarch64 only. Checked against
//! Node 26.12.1's `Math.log` on arm64: 0 of 2,000,016 values differ (two
//! seeds, plus zeros, infinities, NaN and subnormals). Unfused, 1,433 of the
//! first 926,870 positive normal values differ; with `f64::ln`, 20,897 of the
//! first million. The x86-64 form is
//! fdlibm as written and has not been checked against an x86-64 Node.
//!
//! fdlibm: Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
//! Developed at SunSoft, a Sun Microsystems, Inc. business. Permission to use,
//! copy, modify, and distribute this software is freely granted, provided that
//! this notice is preserved.

const LN2_HI: f64 = f64::from_bits(0x3FE6_2E42_FEE0_0000);
const LN2_LO: f64 = f64::from_bits(0x3DEA_39EF_3579_3C76);
const TWO54: f64 = f64::from_bits(0x4350_0000_0000_0000);
const LG1: f64 = f64::from_bits(0x3FE5_5555_5555_5593);
const LG2: f64 = f64::from_bits(0x3FD9_9999_9997_FA04);
const LG3: f64 = f64::from_bits(0x3FD2_4924_9422_9359);
const LG4: f64 = f64::from_bits(0x3FCC_71C5_1D8E_78AF);
const LG5: f64 = f64::from_bits(0x3FC7_4664_96CB_03DE);
const LG6: f64 = f64::from_bits(0x3FC3_9A09_D078_C69F);
const LG7: f64 = f64::from_bits(0x3FC2_F112_DF3E_5244);
const ONE_THIRD: f64 = f64::from_bits(0x3FD5_5555_5555_5555);

/// `a * b + c`, rounded once where V8's build fuses it, twice elsewhere.
#[inline(always)]
fn mul_add(a: f64, b: f64, c: f64) -> f64 {
    if cfg!(target_arch = "aarch64") {
        a.mul_add(b, c)
    } else {
        a * b + c
    }
}

fn high_word(x: f64) -> i32 {
    (x.to_bits() >> 32) as u32 as i32
}

fn low_word(x: f64) -> u32 {
    x.to_bits() as u32
}

fn with_high_word(x: f64, hi: i32) -> f64 {
    f64::from_bits((u64::from(hi as u32) << 32) | u64::from(low_word(x)))
}

pub fn log(mut x: f64) -> f64 {
    let mut hx = high_word(x);
    let lx = low_word(x);
    let mut k: i32 = 0;

    if hx < 0x0010_0000 {
        // x < 2^-1022
        if ((hx & 0x7fff_ffff) as u32 | lx) == 0 {
            return f64::NEG_INFINITY; // log(+-0) = -inf
        }
        if hx < 0 {
            return f64::NAN; // log(negative) = NaN
        }
        k -= 54;
        x *= TWO54; // subnormal: scale up
        hx = high_word(x);
    }
    if hx >= 0x7ff0_0000 {
        return x + x;
    }
    k += (hx >> 20) - 1023;
    hx &= 0x000f_ffff;
    let i = (hx + 0x95f64) & 0x0010_0000;
    x = with_high_word(x, hx | (i ^ 0x3ff0_0000)); // normalize x or x/2
    k += i >> 20;
    let f = x - 1.0;

    if (0x000f_ffff & (2 + hx)) < 3 {
        // -2^-20 <= f < 2^-20
        if f == 0.0 {
            if k == 0 {
                return 0.0;
            }
            let dk = f64::from(k);
            return mul_add(dk, LN2_HI, dk * LN2_LO);
        }
        let r = f * f * mul_add(-ONE_THIRD, f, 0.5);
        if k == 0 {
            return f - r;
        }
        let dk = f64::from(k);
        return mul_add(dk, LN2_HI, -(mul_add(-dk, LN2_LO, r) - f));
    }

    let s = f / (2.0 + f);
    let dk = f64::from(k);
    let z = s * s;
    let mut i = hx - 0x6147a;
    let w = z * z;
    let j = 0x6b851 - hx;
    let t1 = w * mul_add(w, mul_add(w, LG6, LG4), LG2);
    let t2 = z * mul_add(w, mul_add(w, mul_add(w, LG7, LG5), LG3), LG1);
    i |= j;
    let r = t2 + t1;
    if i > 0 {
        let hfsq = 0.5 * f * f;
        if k == 0 {
            f - mul_add(-s, hfsq + r, hfsq)
        } else {
            mul_add(
                dk,
                LN2_HI,
                -((hfsq - mul_add(s, hfsq + r, dk * LN2_LO)) - f),
            )
        }
    } else if k == 0 {
        mul_add(-s, f - r, f)
    } else {
        mul_add(dk, LN2_HI, -(mul_add(s, f - r, -(dk * LN2_LO)) - f))
    }
}

#[cfg(test)]
mod tests {
    /// Compares against `Math.log` bits written by Node:
    /// `BM25_LOG_FIXTURE=<file> cargo test` with lines of `<input bits> <output bits>` in hex.
    #[test]
    fn matches_v8_math_log() {
        let Ok(path) = std::env::var("BM25_LOG_FIXTURE") else {
            return;
        };
        let text = std::fs::read_to_string(path).expect("fixture");
        let mut checked = 0;
        let mut mismatched = 0;
        for line in text.lines() {
            let mut parts = line.split(' ');
            let input = u64::from_str_radix(parts.next().unwrap(), 16).unwrap();
            let expected = u64::from_str_radix(parts.next().unwrap(), 16).unwrap();
            let got = super::log(f64::from_bits(input)).to_bits();
            let both_nan = f64::from_bits(got).is_nan() && f64::from_bits(expected).is_nan();
            if got != expected && !both_nan {
                mismatched += 1;
            }
            checked += 1;
        }
        println!("checked {checked}, mismatched {mismatched}");
        assert_eq!(mismatched, 0);
    }
}
