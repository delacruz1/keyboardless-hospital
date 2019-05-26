################################################################################
## IMPORTS #####################################################################
################################################################################

from google.appengine.ext import ndb

################################################################################
## USER MODEL ##################################################################
################################################################################

class User(ndb.Model):
	name_first     = ndb.StringProperty()
	name_last      = ndb.StringProperty()
        email          = ndb.StringProperty()
	amazon         = ndb.StringProperty()


################################################################################
################################################################################
################################################################################


################################################################################
## SURVEY MODEL ################################################################
################################################################################


class Survey(ndb.Model):
	name        = ndb.StringProperty()
	owners      = ndb.StringProperty(repeated=True) #Change to user object
	respondants = ndb.StringProperty(repeated=True) #Change to user object
	json        = ndb.StringProperty() #best former

################################################################################
################################################################################
################################################################################

################################################################################
## RESPONSE MODEL ##############################################################
################################################################################

class Response(ndb.Model):
	survey   = nbd.StringProperty() #Change to Survey object
	json     = nbd.StringProperty()


################################################################################
################################################################################
################################################################################

################################################################################
## ASSIST MODEL ################################################################
################################################################################

class Assist(ndb.Model):
        survey    = nbd.StringProperty() #Change to Survey object
	submitter = nbd.StringProperty() #Change to User object
	question  = nbd.StringProperty() #Change to Survey object
	response  = nbd.StringProperty() #Change to Survey object


################################################################################
################################################################################
################################################################################

################################################################################
## SETTING MODEL ###############################################################
################################################################################


class Setting(ndb.Model):
	year                   = ndb.IntegerProperty()
	quarter                = ndb.IntegerProperty()
	num_labs               = ndb.IntegerProperty()
	repeat_partners        = ndb.BooleanProperty(default=False)
	cross_section_partners = ndb.BooleanProperty(default=False)
        group_max              = ndb.IntegerProperty()


################################################################################
################################################################################
################################################################################
