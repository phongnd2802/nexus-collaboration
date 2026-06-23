import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CalendarView, UserPreferences } from '../../types/calendar'
import { Settings, Clock, Bell, MapPin } from 'lucide-react'
import { CalendarSettings } from './CalendarSettings'
import { useIntl } from 'react-intl'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  openRoomDialog?: boolean
}

export function SettingsDialog({ open, onClose, openRoomDialog = false }: SettingsDialogProps) {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id: `modules.calendar.settingsDialog.${id}` }, values)

  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultView: 'month',
    weekStartsOn: 0,
    defaultEventDuration: 60,
    workingHours: {
      start: '09:00',
      end: '17:00',
    },
    workingDays: [1, 2, 3, 4, 5],
    defaultReminders: [],
    showWeekNumbers: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    showDeclinedEvents: false,
    showTentativeEvents: true,
    enableWeatherIntegration: false,
    enableSmartScheduling: true,
    focusTimePreferences: [],
  })

  const weekDays = [
    { value: 0, label: t('display.weekDays.sunday') },
    { value: 1, label: t('display.weekDays.monday') },
    { value: 2, label: t('display.weekDays.tuesday') },
    { value: 3, label: t('display.weekDays.wednesday') },
    { value: 4, label: t('display.weekDays.thursday') },
    { value: 5, label: t('display.weekDays.friday') },
    { value: 6, label: t('display.weekDays.saturday') },
  ]

  const calendarViews: { value: CalendarView; label: string }[] = [
    { value: 'day', label: t('display.views.day') },
    { value: 'week', label: t('display.views.week') },
    { value: 'month', label: t('display.views.month') },
    { value: 'year', label: t('display.views.year') },
    { value: 'agenda', label: t('display.views.agenda') },
  ]

  const handleSave = () => {
    // Save preferences to backend/local storage
    console.log('Saving preferences:', preferences)
    onClose()
  }

  const toggleWorkingDay = (day: number) => {
    const newDays = preferences.workingDays.includes(day)
      ? preferences.workingDays.filter(d => d !== day)
      : [...preferences.workingDays, day].sort()
    setPreferences({ ...preferences, workingDays: newDays })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={openRoomDialog ? "rooms" : "display"} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="display">{t('tabs.display')}</TabsTrigger>
            <TabsTrigger value="time">{t('tabs.time')}</TabsTrigger>
            <TabsTrigger value="notifications">{t('tabs.notifications')}</TabsTrigger>
            <TabsTrigger value="rooms">{t('tabs.rooms')}</TabsTrigger>
            <TabsTrigger value="advanced">{t('tabs.advanced')}</TabsTrigger>
          </TabsList>

          <TabsContent value="display" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t('display.defaultView')}</Label>
              <Select
                value={preferences.defaultView}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, defaultView: value as CalendarView })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calendarViews.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('display.weekStartsOn')}</Label>
              <Select
                value={preferences.weekStartsOn.toString()}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, weekStartsOn: parseInt(value) as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map(({ value, label }) => (
                    <SelectItem key={value} value={value.toString()}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="weekNumbers">{t('display.showWeekNumbers')}</Label>
              <Switch
                id="weekNumbers"
                checked={preferences.showWeekNumbers}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, showWeekNumbers: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="tentativeEvents">{t('display.showTentativeEvents')}</Label>
              <Switch
                id="tentativeEvents"
                checked={preferences.showTentativeEvents}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, showTentativeEvents: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="declinedEvents">{t('display.showDeclinedEvents')}</Label>
              <Switch
                id="declinedEvents"
                checked={preferences.showDeclinedEvents}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, showDeclinedEvents: checked })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="time" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t('time.timeFormat')}</Label>
              <Select
                value={preferences.timeFormat}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, timeFormat: value as '12h' | '24h' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">{t('time.format12h')}</SelectItem>
                  <SelectItem value="24h">{t('time.format24h')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('time.defaultEventDuration')}</Label>
              <Input
                type="number"
                value={preferences.defaultEventDuration}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    defaultEventDuration: parseInt(e.target.value) || 60,
                  })
                }
                min="15"
                max="480"
                step="15"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('time.workingHours')}</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">{t('time.startTime')}</Label>
                  <Input
                    type="time"
                    value={preferences.workingHours.start}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        workingHours: { ...preferences.workingHours, start: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-sm">{t('time.endTime')}</Label>
                  <Input
                    type="time"
                    value={preferences.workingHours.end}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        workingHours: { ...preferences.workingHours, end: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('time.workingDays')}</Label>
              <div className="flex flex-wrap gap-2">
                {weekDays.map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={preferences.workingDays.includes(value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleWorkingDay(value)}
                  >
                    {label.slice(0, 3)}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">{t('notifications.defaultReminders')}</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('notifications.defaultRemindersDesc')}
                </p>
                <Button variant="outline" size="sm">
                  <Bell className="h-4 w-4 mr-2" />
                  {t('notifications.addReminder')}
                </Button>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">{t('notifications.notificationPreferences')}</h4>
                <div className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailNotif">{t('notifications.emailNotifications')}</Label>
                    <Switch id="emailNotif" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pushNotif">{t('notifications.pushNotifications')}</Label>
                    <Switch id="pushNotif" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="soundNotif">{t('notifications.soundNotifications')}</Label>
                    <Switch id="soundNotif" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-4 mt-4">
            <CalendarSettings onClose={() => {}} openRoomDialog={openRoomDialog} />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smartScheduling">{t('advanced.smartScheduling')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('advanced.smartSchedulingDesc')}
                  </p>
                </div>
                <Switch
                  id="smartScheduling"
                  checked={preferences.enableSmartScheduling}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, enableSmartScheduling: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weatherIntegration">{t('advanced.weatherIntegration')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('advanced.weatherIntegrationDesc')}
                  </p>
                </div>
                <Switch
                  id="weatherIntegration"
                  checked={preferences.enableWeatherIntegration}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, enableWeatherIntegration: checked })
                  }
                />
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">{t('advanced.focusTime')}</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('advanced.focusTimeDesc')}
                </p>
                <Button variant="outline" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  {t('advanced.addFocusTime')}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('actions.saveSettings')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}