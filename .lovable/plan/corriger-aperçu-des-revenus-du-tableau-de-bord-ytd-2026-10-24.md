# Corriger « Aperçu des revenus » du tableau de bord (YTD)

## Constat (vérifié sur vos données 2026)

Vos vraies réservations 2026 actives (confirmées, terminées, en attente), comptées par date d'arrivée : 64 réservations, 519 nuits, 58 110 € au total. Sur ce total, 54 510 € sont encaissés et 3 470 € restent dus (échéances).


| Carte                | Affiché aujourd'hui | Problème                                                                                          |
| -------------------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| Revenus bruts        | 58 110 €            | Correct                                                                                           |
| Revenus nets         | 0 €                 | Le calcul se base sur l'ancien système de « versements » de la plateforme, qui est vide pour vous |
| Paiements en attente | 0 €                 | Même cause : l'ancien système, toujours vide                                                      |
| Taux d'occupation    | ~56 %               | Moyenne mal pondérée entre les mois et les appartements, sans rapport avec vos nuits réelles      |
| Tarif moyen          | approximatif        | Basé sur les mêmes moyennes mensuelles                                                            |


## Corrections proposées

Toutes les cartes seront calculées directement à partir de vos réservations et de vos échéances de l'année en cours, avec les mêmes règles que l'onglet Paiements (même filtre de statuts, même année, date d'arrivée).

- **Taux d'occupation** : nuits louées en 2026 ÷ (nombre d'appartements × jours écoulés depuis le 1er janvier). Les blocages ne comptent pas comme des nuits louées.
- **Tarif moyen** : total du séjour hors ménage ÷ nuits louées.
- **Revenus bruts** : somme des prix totaux (inchangé : 58 110 €).
- **Revenus nets** : revenus bruts moins les frais de ménage. Comme aucune commission n'est appliquée, cela donne ici 55 275 €.
- **Paiements en attente** devient **« Reste à encaisser »** : échéances non payées des réservations 2026 (3 470 €). Ce montant correspond au « En attente » + « En retard » de l'onglet Paiements.

## Question ouverte

Pour l'occupation, deux choix sont possibles : sur les jours écoulés depuis le 1er janvier (YTD strict, proposé), ou sur toute l'année 2026 en incluant les réservations à venir. Je pars sur YTD strict, sauf avis contraire de votre part. Pars l'idée de faire sur l'année entière, réservation future et passée de l'année (en 2026 cette année-ci). 

## Détails techniques

- Réécrire `DashboardEarningsSummary.tsx` : ne plus utiliser `get_host_earnings_report` ni `get_host_dashboard_kpis` (qui reposent sur la table `payouts`, vide). À la place, interroger directement `bookings` (avec la jointure sur les listings de l'hôte, statuts confirmed/completed/pending_payment, checkin_date dans l'année), `booking_payment_items` (par lots de 100, comme dans HostPaymentsBookingsList) et le nombre de listings.
- Pour l'occupation YTD, ne compter que les nuits comprises entre le 1er janvier et aujourd'hui.
- Garder la même présentation (5 cartes) et les mêmes liens.
- Vérification : comparer les chiffres affichés aux valeurs SQL ci-dessus, avec le compte propriétaire.