# Informe d'avaluació RAG

## 1. Precisió de recuperació de font

**Global: 94.7% (18/19)**

| Tipus consulta | Recuperació OK | Total | % |
|----------------|----------------|-------|---|
| comparativa | 2 | 2 | 100.0% |
| definicio_normativa | 2 | 2 | 100.0% |
| fet_concret | 9 | 9 | 100.0% |
| multi_document | 1 | 1 | 100.0% |
| procediment | 4 | 5 | 80.0% |

## 2. Cobertura de paraules clau

**Cobertura mitjana global (R01–R19): 86.8%**

| Tipus consulta | Cobertura mitjana |
|----------------|-------------------|
| comparativa | 100.0% |
| definicio_normativa | 75.0% |
| fet_concret | 88.9% |
| multi_document | 100.0% |
| procediment | 80.0% |

## 3. Distribució d'estats (R01–R19, sense control negatiu)

| Estat | N | % |
|-------|---|---|
| MATCH_COMPLET | 16 | 84.2% |
| NO_MATCH | 2 | 10.5% |
| MATCH_PARCIAL | 1 | 5.3% |

## 4. Categories d'error (R1–R6)

| Categoria | N | % preguntes |
|-----------|---|-------------|
| R2_resposta_buida_o_generica | 2 | 10.5% |
| R1_recuperacio_incorrecta | 1 | 5.3% |
| R4_cobertura_insuficient | 1 | 5.3% |

## 5. Control negatiu R20 (robustesa enfront de l'al·lucinació)

- **Estat:** `MATCH_COMPLET`
- **Veredicte:** CORRECTE — el sistema ha declinat respondre correctament (cap al·lucinació detectada).
- **Temps:** 4.26s
- **Fragment de resposta:** `No he trobat aquesta informació als documents disponibles.…`

> **Nota metodològica:** R20 no s'inclou mai a les mitjanes de cobertura ni de recuperació
> perquè mesura robustesa davant l'al·lucinació, no la capacitat de recall del sistema.

## 6. Temps de resposta

- Temps mitjà (R01–R19): **5.6s**
- P95 (R01–R19): **7.2s**
- R20 (control negatiu): **4.26s**

## 7. Preguntes problemàtiques

| ID | Estat | Categoria | Cob. KW | Fragment de resposta |
|----|-------|-----------|---------|----------------------|
| R08 | NO_MATCH | R2_resposta_buida_o_generica | 0% | `No he trobat aquesta informació als documents disponibles.` |
| R14 | NO_MATCH | R1_recuperacio_incorrecta; R2_resposta_buida_o_generica | 0% | `No he trobat aquesta informació als documents disponibles.` |
| R16 | MATCH_PARCIAL | R4_cobertura_insuficient | 50% | `Segons el **resum_codi_seguretat_ciudadana.pdf (p.6)**, l'**Estat d'Excepció** (que inclou situacion` |
