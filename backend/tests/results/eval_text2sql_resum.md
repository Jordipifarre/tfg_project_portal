# Informe d'avaluació Text-to-SQL

## 1. Precisió selecció de taula

**Global: 100.0% (20/20)**

| Dataset | OK | Total | % |
|---------|-----|-------|---|
| fets_aeroports | 5 | 5 | 100.0% |
| fets_odi_discriminacio | 5 | 5 | 100.0% |
| fets_penals_detencions | 5 | 5 | 100.0% |
| fets_transport_public | 5 | 5 | 100.0% |

## 2. Precisió resultats (MATCH\_EXACTE)

**Global: 100.0% (20/20)**

| Tipus consulta | MATCH | Total | % |
|----------------|-------|-------|---|
| agregacio_simple | 4 | 4 | 100.0% |
| comparativa | 4 | 4 | 100.0% |
| evolucio_temporal | 4 | 4 | 100.0% |
| filtre_geo_temporal | 4 | 4 | 100.0% |
| top_n_ranking | 4 | 4 | 100.0% |

## 3. Distribució d'estats

| Estat | N | % |
|-------|---|---|
| MATCH_EXACTE | 20 | 100.0% |

## 4. Categories d'error

| Categoria | N | % preguntes |
|-----------|---|-------------|

## 5. Correccions SQL

**2/20 preguntes (10.0%) han necessitat correccions de columna o filtre.**

## 6. Temps de resposta

- Temps mitjà: **7.1s**
- P95: **11.2s**

## 7. Preguntes problemàtiques (NO\_MATCH / MATCH\_PARCIAL / ERROR)

Cap pregunta problemàtica.

