"""
Module d'analyse IA pour la prédiction de tendances boursières
Utilise des indicateurs techniques et génère des analyses en langage professionnel
"""
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple

class AIStockAnalyzer:
    """Analyseur IA pour les actions de la BVMT"""

    def __init__(self):
        self.min_data_points = 20  # Minimum de points pour une analyse fiable

    def analyze_stock_with_indicators(self, indicators: Dict, current_price: float,
                                     support: float, resistance: float,
                                     current_volume: float, previous_volume: float,
                                     avg_volume_20: float, volume_trend: str) -> Dict:
        """
        Analyse une action avec des indicateurs déjà calculés (côté JS)

        Args:
            indicators: Dict contenant rsi, macd, macd_signal, sma_20, sma_50, momentum
            current_price: Prix actuel
            support: Niveau de support
            resistance: Niveau de résistance
            current_volume: Volume du jour actuel
            previous_volume: Volume du jour précédent
            avg_volume_20: Volume moyen sur 20 jours
            volume_trend: Tendance du volume (hausse/baisse/stable)

        Returns:
            Dictionnaire contenant l'analyse complète
        """
        try:
            # Analyser la tendance avec les indicateurs fournis
            trend_analysis = self._analyze_trend_from_indicators(
                indicators, current_price
            )

            # Analyser les supports et résistances
            support_resistance = {
                'support': support,
                'resistance': resistance,
                'support_distance': ((current_price - support) / current_price) * 100,
                'resistance_distance': ((resistance - current_price) / current_price) * 100,
                'breakout': 'résistance' if current_price > resistance * 0.98 else
                           ('support' if current_price < support * 1.02 else None)
            }

            # Analyser le volume
            volume_analysis = self._analyze_volume_from_values(
                current_volume, previous_volume, avg_volume_20, volume_trend
            )

            # Calculer les objectifs de prix (court, moyen, long terme)
            price_targets = self._calculate_price_targets(
                current_price, support, resistance, trend_analysis
            )

            # Générer le texte d'analyse professionnel
            analysis_text = self._generate_analysis_text_v2(
                current_price, trend_analysis, support_resistance, volume_analysis, price_targets
            )

            # Calculer la confiance globale
            confidence = self._calculate_confidence(
                trend_analysis, support_resistance, volume_analysis
            )

            return {
                'success': True,
                'trend': trend_analysis['direction'],
                'confidence': round(confidence, 2),
                'analysis': analysis_text,
                'current_price': current_price,
                'support': round(support, 2),
                'resistance': round(resistance, 2),
                'timestamp': datetime.now().isoformat(),
                'price_targets': price_targets,
                'indicators': {
                    'rsi': indicators.get('rsi'),
                    'macd_signal': trend_analysis.get('macd_signal'),
                    'volume_trend': volume_analysis['trend']
                }
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Erreur lors de l\'analyse: {str(e)}'
            }

    def _analyze_trend_from_indicators(self, indicators: Dict, current_price: float) -> Dict:
        """Analyse la tendance à partir des indicateurs calculés en JS"""
        rsi = indicators.get('rsi', 50)
        macd = indicators.get('macd', 0)
        macd_signal_val = indicators.get('macd_signal', 0)
        sma_20 = indicators.get('sma_20', current_price)
        sma_50 = indicators.get('sma_50', current_price)
        momentum = indicators.get('momentum', 0)

        # Déterminer la direction
        signals = []

        # Signal 1: Prix vs moyennes mobiles
        if current_price > sma_20 and current_price > sma_50:
            signals.append(1)
        elif current_price < sma_20 and current_price < sma_50:
            signals.append(-1)
        else:
            signals.append(0)

        # Signal 2: MACD
        if macd > macd_signal_val:
            signals.append(1)
            macd_status = "haussier"
        elif macd < macd_signal_val:
            signals.append(-1)
            macd_status = "baissier"
        else:
            signals.append(0)
            macd_status = "neutre"

        # Signal 3: RSI
        if rsi > 70:
            signals.append(-1)  # Suracheté
            rsi_status = "zone de surachat"
        elif rsi < 30:
            signals.append(1)  # Survendu
            rsi_status = "zone de survente"
        elif rsi > 50:
            signals.append(1)
            rsi_status = "positif"
        else:
            signals.append(-1)
            rsi_status = "négatif"

        # Signal 4: Momentum
        if momentum > 0:
            signals.append(1)
        else:
            signals.append(-1)

        # Déterminer la tendance globale
        avg_signal = np.mean(signals)

        if avg_signal > 0.3:
            direction = "haussière"
            strength = "forte" if avg_signal > 0.7 else "modérée"
        elif avg_signal < -0.3:
            direction = "baissière"
            strength = "forte" if avg_signal < -0.7 else "modérée"
        else:
            direction = "neutre"
            strength = "consolidation"

        return {
            'direction': direction,
            'strength': strength,
            'macd_signal': macd_status,
            'rsi_status': rsi_status,
            'rsi_value': rsi,
            'signals_score': avg_signal
        }

    def _analyze_volume_from_values(self, current_volume: float, previous_volume: float, avg_volume_20: float, volume_trend: str) -> Dict:
        """Analyse le volume à partir des valeurs actuelles et précédentes"""
        volume_ratio = current_volume / avg_volume_20 if avg_volume_20 > 0 else 1
        day_ratio = current_volume / previous_volume if previous_volume > 0 else 1

        # Déterminer si le volume est en hausse, baisse ou stable
        if volume_trend == "hausse":
            trend = "hausse"
            status = "soutenu"
        elif volume_trend == "baisse":
            trend = "baisse"
            status = "faible"
        else:
            trend = "stable"
            status = "normal"

        return {
            'trend': trend,
            'status': status,
            'ratio': round(volume_ratio, 2),
            'day_ratio': round(day_ratio, 2),
            'current': int(current_volume),
            'average': int(avg_volume_20)
        }

    def _calculate_price_targets(self, current_price: float, support: float, resistance: float, trend: Dict) -> Dict:
        """Calcule les objectifs de prix à court, moyen et long terme"""

        price_range = resistance - support
        atr = price_range / 2  # Estimation de l'ATR

        # Objectifs à court terme (1-3 jours)
        short_term_target = resistance + atr
        short_term_support = support - atr

        # Objectifs à moyen terme (1-4 semaines)
        mid_term_target = resistance + 2 * atr
        mid_term_support = support - 2 * atr

        # Objectifs à long terme (1-3 mois)
        long_term_target = resistance + 3 * atr
        long_term_support = support - 3 * atr

        targets = {
            'short_term': {
                'target': round(short_term_target, 2),
                'support': round(short_term_support, 2)
            },
            'mid_term': {
                'target': round(mid_term_target, 2),
                'support': round(mid_term_support, 2)
            },
            'long_term': {
                'target': round(long_term_target, 2),
                'support': round(long_term_support, 2)
            }
        }

        return targets

    def _generate_analysis_text_v2(
        self, current_price: float, trend: Dict,
        support_resistance: Dict, volume: Dict, price_targets: Dict
    ) -> str:
        """Génère un texte d'analyse en langage professionnel"""

        symbol_name = "Le titre"

        # Phrase d'introduction
        if trend['direction'] == "haussière":
            intro = f"{symbol_name} affiche une dynamique haussière"
            if support_resistance['breakout'] == "résistance":
                intro += f" avec une cassure confirmée au-dessus de {support_resistance['resistance']:.2f} DT"
            else:
                intro += f" évoluant actuellement à {current_price:.2f} DT"
        elif trend['direction'] == "baissière":
            intro = f"{symbol_name} enregistre une tendance baissière"
            if support_resistance['breakout'] == "support":
                intro += f" ayant franchi à la baisse le support des {support_resistance['support']:.2f} DT"
            else:
                intro += f" s'échangeant à {current_price:.2f} DT"
        else:
            intro = f"{symbol_name} évolue dans une phase de consolidation autour de {current_price:.2f} DT"

        # Analyse du volume (par rapport au jour précédent)
        if volume['trend'] == "hausse":
            volume_text = f" avec un volume en hausse de {((volume['day_ratio'] - 1) * 100):.0f}% par rapport à la veille"
        elif volume['trend'] == "baisse":
            volume_text = f" dans un contexte de volumes en baisse de {((1 - volume['day_ratio']) * 100):.0f}% par rapport à la veille"
        else:
            volume_text = " sur des volumes stables"

        # Tendance technique
        if trend['direction'] == "haussière":
            trend_text = f" La tendance reste {trend['direction']} à court terme"
        elif trend['direction'] == "baissière":
            trend_text = f" La pression vendeuse demeure présente à court terme"
        else:
            trend_text = " Les investisseurs demeurent dans l'expectative"

        # Niveaux clés
        if trend['direction'] != "neutre":
            levels_text = f", avec un support situé vers {support_resistance['support']:.2f} DT"
            levels_text += f" et une résistance identifiée aux alentours de {support_resistance['resistance']:.2f} DT"
        else:
            levels_text = f". Le titre oscille entre un support à {support_resistance['support']:.2f} DT"
            levels_text += f" et une résistance à {support_resistance['resistance']:.2f} DT"

        # Indicateurs techniques
        rsi_text = ""
        if trend['rsi_status'] == "zone de surachat":
            rsi_text = " Le RSI en zone de surachat suggère une prudence à court terme."
        elif trend['rsi_status'] == "zone de survente":
            rsi_text = " Le RSI en zone de survente pourrait signaler une opportunité d'achat technique."

        # Objectifs de prix (basés sur la tendance)
        if trend['direction'] == "haussière":
            targets_text = f" Objectifs haussiers : court terme {price_targets['short_term']['target']:.2f} DT, moyen terme {price_targets['mid_term']['target']:.2f} DT, long terme {price_targets['long_term']['target']:.2f} DT."
        elif trend['direction'] == "baissière":
            targets_text = f" Objectifs baissiers : court terme {price_targets['short_term']['support']:.2f} DT, moyen terme {price_targets['mid_term']['support']:.2f} DT, long terme {price_targets['long_term']['support']:.2f} DT."
        else:
            targets_text = f" En cas de sortie de range : objectif haussier {price_targets['mid_term']['target']:.2f} DT, objectif baissier {price_targets['mid_term']['support']:.2f} DT."

        # Conclusion
        if trend['direction'] == "haussière" and volume['trend'] == "hausse":
            conclusion = " Les indicateurs techniques plaident en faveur d'une poursuite du mouvement haussier."
        elif trend['direction'] == "baissière" and volume['trend'] == "hausse":
            conclusion = " La configuration technique reste défavorable à court terme."
        elif trend['direction'] == "neutre":
            conclusion = " Une cassure de l'un des niveaux clés donnera la direction du prochain mouvement."
        else:
            conclusion = " Un suivi rapproché des volumes s'impose pour confirmer la tendance."

        # Assemblage final
        analysis = intro + "." + volume_text + "." + trend_text + levels_text + "." + rsi_text + targets_text + conclusion

        return analysis

    def _calculate_confidence(
        self, trend: Dict, support_resistance: Dict, volume: Dict
    ) -> float:
        """Calcule le niveau de confiance de l'analyse"""

        confidence = 0.5  # Base

        # Bonus pour une tendance forte
        if trend['strength'] in ['forte', 'forte hausse', 'forte baisse']:
            confidence += 0.2
        elif trend['strength'] == 'modérée':
            confidence += 0.1

        # Bonus pour volume confirmant la tendance
        if (trend['direction'] == 'haussière' and volume['trend'] == 'hausse') or \
           (trend['direction'] == 'baissière' and volume['trend'] == 'hausse'):
            confidence += 0.15

        # Bonus pour RSI dans des zones extrêmes
        if trend['rsi_status'] in ['zone de surachat', 'zone de survente']:
            confidence += 0.1

        # Bonus pour cassure
        if support_resistance['breakout']:
            confidence += 0.15

        # Malus pour tendance neutre
        if trend['direction'] == 'neutre':
            confidence -= 0.2

        # S'assurer que la confiance reste entre 0 et 1
        confidence = max(0.3, min(0.95, confidence))

        return confidence

