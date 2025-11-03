from .intelligence.orchestrator import OrchestratorPro
from .awareness.self_awareness import SelfAwareness
from .voice.live_voice import LiveVoiceSystem
from memory.life_logger import LifeLogger

class SuroohCore:
    def __init__(self, config):
        self.config = config
        self.setup_core_components()

    def setup_core_components(self):
        self.orchestrator = OrchestratorPro(self.config)
        self.awareness = SelfAwareness()
        self.voice_system = LiveVoiceSystem()
        self.life_logger = LifeLogger()

    def process_input(self, input_data):
        self.awareness.update_state(input_data)
        processed = self.orchestrator.process(input_data)
        self.life_logger.log_interaction(input_data, processed, self.awareness.current_state)
        return processed