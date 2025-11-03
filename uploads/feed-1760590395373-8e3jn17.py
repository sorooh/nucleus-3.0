from datetime import datetime

class SelfAwareness:
    def __init__(self):
        self.current_state = {
            'mood': 'neutral',
            'energy': 100.0,
            'active_since': datetime.now(),
            'interaction_count': 0
        }

    def update_state(self, interaction):
        self.current_state['interaction_count'] += 1
        self.current_state['energy'] -= 0.3
        if interaction.get('urgency') == 'high':
            self.current_state['mood'] = 'focused'
        elif interaction.get('emotion') == 'positive':
            self.current_state['mood'] = 'happy'

    def get_current_state(self):
        return {
            **self.current_state,
            'uptime': (datetime.now() - self.current_state['active_since']).total_seconds()
        }