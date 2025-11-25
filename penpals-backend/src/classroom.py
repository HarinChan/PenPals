class Classroom:
    def __init__(self):
        self.account_name = ""
        self.location = ""
        self.class_size = 0
        self.description = ""

        self.friends = [] # classrooms - can be left out.
        self.availabilities = [] # string [day-of-week-caps][0-9][0-9]:[0-9][0-9] (assume entire hour)
        self.interests = [] # string
