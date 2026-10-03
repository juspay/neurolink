# Explicit-answer tools

`HITLConfig.autoApproveExclusions` is a list of exact tool identities. A listed
tool still asks for confirmation and can execute after an explicit approval,
but cannot auto-approve when the confirmation timer expires. Other tools keep
the configured `autoApproveOnTimeout` behavior. The list defaults to empty.

A host that treats OAuth as an explicit user choice configures the exact names
it registers for `connect_data_source` and `change_data_source_account` here.
Qualified names remain qualified; the policy does not match substrings or
change which tools require confirmation.
