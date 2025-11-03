from ..awareness.emotion_engine import EmotionEngine
from bots.registry import BotRegistry

class OrchestratorPro:
    def __init__(self, config):
        self.config = config
        self.emotion_engine = EmotionEngine()
        self.bot_registry = BotRegistry()

    def process(self, input_data):
        emotion_analysis = self.emotion_engine.analyze(input_data)
        if self._requires_bot(input_data):
            bot = self.bot_registry.get_bot(input_data['type'])
            return bot.handle(input_data)
        else:
            return self._default_processing(input_data, emotion_analysis)

    def _requires_bot(self, input_data):
        return input_data.get('type') in ['accounting', 'legal', 'design']

    def _default_processing(self, input_data, emotion):
        return {
            'response': 'تم معالجة طلبك',
            'emotion_adjusted': emotion['suggested_tone'],
            'context': input_data.get('context', {})
        }