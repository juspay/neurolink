// Fixture: this module exists, but the package it imports does not.
//
// Importing it produces ERR_MODULE_NOT_FOUND naming the *transitive* package,
// not this file — which is exactly the case tryImport must NOT rewrite into
// "install this module", because the module itself is present.
import "neurolink-fixture-absent-transitive-dep";

export const unreachable = true;
