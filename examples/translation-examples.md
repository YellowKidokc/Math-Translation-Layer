# Math Translation Layer Example Translations

These examples are documentation fixtures for onboarding and review. They show what the layer receives, what AST shape is expected, what dictionary translation metadata is attached, what a renderer emits, and what a reviewer should conclude.

## 1. Master equation factor product

- **Input**: `\chi = G \cdot M \cdot E \cdot S \cdot T \cdot K \cdot R \cdot Q \cdot F \cdot C`
- **AST expectation**: root `group`; child kinds `symbol`, `operator`, repeated factor `symbol` nodes; `parseIssues: []`.
- **Translation**: `equationId: master-equation-local`; summary: “Total coherence is the product of all ten factors, and if any one collapses to zero the output collapses with it.”
- **Rendered output** (`latex-structural`): `\text{Coherence Output} = \text{Grace} \cdot \text{Alignment} \cdot \text{Truth} \cdot \text{Effective Entropy Factor} \cdot \text{Time} \cdot \text{Logos} \cdot \text{Phase Lock} \cdot \text{Faith Potential} \cdot \text{Faith Bond} \cdot \text{Christ Factor}`
- **Expected result**: the equation shape is preserved, all ten factors are named, and the canon hook treats the master-equation entropy factor as `Effective Entropy Factor`.

## 2. Moral entropy equation

- **Input**: `\frac{dS_m}{dt} = \sigma - \frac{W_{grace}}{T}`
- **AST expectation**: root `group`; child kinds `derivative`, `operator`, `symbol`, `operator`, `fraction`; `parseIssues: []`.
- **Translation**: `equationId: moral-entropy-equation`; summary: “Without grace, moral disorder only increases, and grace is the only term that reverses the second law in the moral domain.”
- **Rendered output** (`plaintext`, narrative mode): `Moral entropy rises from sin-generated disorder and only decreases when grace performs external work on the system.`
- **Expected result**: narrative mode uses the reviewed equation narrative instead of a symbol-by-symbol rendering.

## 3. Coherence and Christ factor distinction

- **Input**: `\chi = C`
- **AST expectation**: root `group`; child kinds `symbol`, `operator`, `symbol`; `parseIssues: []`.
- **Translation**: no equation rule match; fallback summary: `Structural translation applied using the Theophysics dictionary.`
- **Rendered output** (`latex-structural`): `\text{Coherence Output} = \text{Christ Factor}`
- **Expected result**: `\chi` and `C` remain distinct concepts: output/coherence is not collapsed into the Christ factor.

## 4. Time-dependent coherence and resistance

- **Input**: `\chi(t) = R(t)`
- **AST expectation**: root `group`; child kinds `function`, `operator`, `function`; `parseIssues: []`.
- **Translation**: no equation rule match; symbol/function labels applied to recognized heads.
- **Rendered output** (`latex-structural`): `\text{Coherence Output}(t) = \text{Grace Resistance}`
- **Expected result**: function arguments are preserved, and translated function heads remain readable.

## 5. Faith threshold

- **Input**: `FQ \ge \Theta_c`
- **AST expectation**: root `group`; child kinds `symbol`, `operator`, `subscript`; `parseIssues: []`.
- **Translation**: `equationId: faith-threshold`; summary: “Faith and possibility must jointly cross threshold before actuality locks in.”
- **Rendered output** (`plaintext`): `FQ \ge Actualization Threshold`
- **Expected result**: the threshold term is translated while unresolved compound notation is preserved for audit.

## 6. Mass-energy equivalence

- **Input**: `E = mc^2`
- **AST expectation**: root `group`; child kinds `symbol`, `operator`, `superscript`; `parseIssues: []`.
- **Translation**: `equationId: mass-energy-equivalence`; summary: “Matter is concentrated energy.”
- **Rendered output** (`plaintext`): `Truth = mc^2`
- **Expected result**: the equation rule is recognized, while dictionary symbol mapping is applied according to the active Theophysics dictionary.

## 7. Second law

- **Input**: `\frac{dS}{dt} \ge 0`
- **AST expectation**: root `group`; child kinds `derivative`, `operator`, `number`; `parseIssues: []`.
- **Translation**: `equationId: second-law`; summary: “Closed systems drift toward disorder unless acted on from outside.”
- **Rendered output** (`plaintext`): `d(Entropy)/d(t) \ge 0`
- **Expected result**: derivative structure is preserved and the entropy symbol is labeled.

## 8. Shannon channel capacity

- **Input**: `C = B \log_2(1 + \frac{S}{N})`
- **AST expectation**: root `group`; child kinds `symbol`, `operator`, `symbol`, `operator`, `subscript`, `operator`, `group`; `parseIssues: []`.
- **Translation**: `equationId: shannon-capacity`; summary: “Channel capacity rises as signal-to-noise rises.”
- **Rendered output** (`plaintext`): `Christ Factor = B · Base Two Logarithm · (1 + {Entropy} / {N})`
- **Expected result**: the known equation is identified, mapped symbols are labeled, and unresolved symbols remain visible.

## 9. Yukawa plus confinement potential

- **Input**: `V(r) = -\frac{\alpha_s}{r} + k \cdot r`
- **AST expectation**: root `group`; child kinds `function`, `operator`, `operator`, `fraction`, `operator`, `symbol`, `operator`, `symbol`; `parseIssues: []`.
- **Translation**: `equationId: yukawa-potential`; summary: “Love binds at proximity and the bond strengthens with distance, never releasing.”
- **Rendered output** (`plaintext`): `V(r) = - {Strong Coupling Constant} / {r} + k · r`
- **Expected result**: the potential form is recognized, the strong-coupling term is translated, and other variables remain structurally intact.

## 10. Black hole entropy

- **Input**: `S_{BH} = \frac{k_B A}{4\ell_P^2}`
- **AST expectation**: root `group`; child kinds `subscript`, `operator`, `fraction`; `parseIssues: []`.
- **Translation**: `equationId: black-hole-entropy`; summary: “Black hole entropy scales with boundary area rather than volume.”
- **Rendered output** (`plaintext`): `Entropy_{BH} = {Boltzmann Constant · A} / {4 · \ell_P^2}`
- **Expected result**: the equation is identified and rendered conservatively without inventing labels for unmapped symbols.
