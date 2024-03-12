import * as React from 'react';
import { Calendar, Views, momentLocalizer } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import moment from 'moment'
import { Container, Box, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, Accordion, AccordionSummary, AccordionDetails, Typography, CircularProgress, Paper } from '@mui/material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { LoadingButton } from '@mui/lab';
import _ from 'lodash'
const localizer = momentLocalizer(moment)

export const DAY_OPS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function Home() {
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(true);
  const [submitLoading, setSubmitLoading] = React.useState(false);
  // eslint-disable-next-line
  const [suggestionLoading, setSuggestionLoading] = React.useState(false);
  // eslint-disable-next-line
  const [suggestion, setSuggestion] = React.useState(null);
  // eslint-disable-next-line
  const [cookie, setCookie] = useCookies(['token', 'refresh_token', 'user']);
  const [openTaskDialog, setOpenTaskDialog] = React.useState(false);
  const [openClassDialog, setOpenClassDialog] = React.useState(false);
  const [openJobDialog, setOpenJobDialog] = React.useState(false);
  // eslint-disable-next-line
  const [events, setEvents] = React.useState([]);
  // eslint-disable-next-line
  const [pref, setPref] = React.useState({
    dayStartTime: moment().format('HH:mm'),
    dayEndTime: moment().endOf('day').format('HH:mm'),
    tasks: [],
    classes: [],
    partTimeJobHours: [],
  })
  function getSuggestions() {
    if (cookie.token && pref.id) {
      setLoading(true);
      fetch(`${process.env.REACT_APP_API_URL}/v1/userPreferences/getSuggestedSchedule/${pref.id}`, {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cookie.token}`,
        },
      }).then(r => r.json()).then((res) => {
        if (res?.status === 401) {
          navigate('/login')
        } else if (res?.data) {
          setSuggestion(res?.data)
          const evs = [];
          Object.values(res.data).forEach(val => {
            if (Object.keys(val.partTimeJob).length > 0) {
              const dm = moment().startOf('week').add(_.find(DAY_OPS, { label: val.day })?.value, 'day')
              const start = new Date(dm.year(), dm.month(), dm.format('DD'), val.partTimeJob.startTime.split(':')[0], val.partTimeJob.startTime.split(':')[0])
              const end = new Date(dm.year(), dm.month(), dm.format('DD'), val.partTimeJob.endTime.split(':')[0], val.partTimeJob.endTime.split(':')[0])
              evs.push({
                start,
                end,
                title: val.partTimeJob.name,
              })
            } else {
              [...val.weekDayTasks, ...val.classTime].forEach(item => {
                const dm = moment().startOf('week').add(item.day, 'day')
                const start = new Date(dm.year(), dm.month(), dm.format('DD'), item.startTime.split(':')[0], item.startTime.split(':')[0])
                const end = new Date(dm.year(), dm.month(), dm.format('DD'), item.endTime.split(':')[0], item.endTime.split(':')[0])
                evs.push({
                  start,
                  end,
                  title: item.name,
                })
              })
            }
          })
          setEvents(evs);
        }
      }, (err) => {
        console.log(err.response)
      })
      .finally(() => setLoading(false))
    }
  }
  function handleSubmitPref() {
    setSubmitLoading(true);
    let url = `${process.env.REACT_APP_API_URL}/v1/userPreferences`;
    const payload = {
      ...pref,
      user: cookie.user?.id
    }
    if (pref.id) {
      url += `/${pref.id}`
      delete payload.user;
      delete payload.id;
    }
    fetch(url, {
      method: pref.id ? 'PATCH' : 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cookie.token}`,
      },
      body: JSON.stringify(payload),
    }).then(r => r.json()).then((res) => {
      if (res?.status === 401) {
        navigate('/login')
      } else {
        setPref(res.data)
        getSuggestions()
      }
    }, (err) => {
      console.log(err.response)
    })
    .finally(() => setSubmitLoading(false))
  }
  function handleSubmitTask(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPref({
      ...pref,
      tasks: [
        ...pref.tasks,
        {
          name: data.get('name'),
          priority: Number(data.get('priority')),
          duration: Number(data.get('duration')),
          day: Number(data.get('day')),
        },
      ],
    })
    setOpenTaskDialog(false)
    setOpenClassDialog(false)
    setOpenJobDialog(false)
  }
  function handleSubmitClass(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPref({
      ...pref,
      classes: [
        ...pref.classes,
        {
          name: data.get('name'),
          startTime: data.get('startTime'),
          endTime: data.get('endTime'),
          day: Number(data.get('day')),
        },
      ],
    })
    setOpenTaskDialog(false)
    setOpenClassDialog(false)
    setOpenJobDialog(false)
  }
  function handleSubmitJob(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPref({
      ...pref,
      partTimeJobHours: [
        ...pref.partTimeJobHours,
        {
          name: data.get('name'),
          day: Number(data.get('day')),
          duration: Number(data.get('duration')),
        },
      ],
    })
    setOpenTaskDialog(false)
    setOpenClassDialog(false)
    setOpenJobDialog(false)
  }
  function deleteTask(index) {
    setPref({
      ...pref,
      tasks: pref.tasks.filter((__, i) => i !== index)
    })
  }
  function deleteClass(index) {
    setPref({
      ...pref,
      classes: pref.classes.filter((__, i) => i !== index)
    })
  }
  function deleteJob(index) {
    setPref({
      ...pref,
      partTimeJobHours: pref.partTimeJobHours.filter((__, i) => i !== index)
    })
  }
  React.useEffect(() => {
    if (cookie.token) {
      setLoading(true);
      fetch(`${process.env.REACT_APP_API_URL}/v1/userPreferences?user=${cookie.user.id}`, {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cookie.token}`,
        },
      }).then(r => r.json()).then((res) => {
        if (res?.status === 401) {
          navigate('/login')
        } else if (res.data?.length > 0) {
          setPref(res?.data[0])
        }
      }, (err) => {
        console.log(err.response)
      })
      .finally(() => setLoading(false))
    } else {
      navigate('/login')
    }
    // eslint-disable-next-line
  }, []);
  function logout() {
    setCookie('token', undefined)
    setCookie('refresh_token', undefined)
    setCookie('user', undefined)
    navigate('/login')
  }
  const { defaultDate, views } = React.useMemo(
    () => ({
      defaultDate: new Date(moment().year(), moment().month(), moment().format('DD')),
      views: {
        month: true,
        week: true,
        day: true,
      },
    }),
    []
  )
  if (loading) return (
    <Container component="main">
      <CircularProgress />
    </Container>
  )
  return (
    <Container component="main" className="flex flex-col py-8">
      <Paper className="flex p-2 items-center gap-4 flex-wrap">
        <Typography className="!font-bold !text-2xl">DAILY SCHEDULES</Typography>
        <Box className="ml-auto">
          <Typography className="text-right">{cookie?.user?.name}</Typography>
          <Typography className="text-right">{cookie?.user?.email}</Typography>
        </Box>
        <Button variant="contained" color="error" size="small" onClick={logout}>Log Out</Button>
      </Paper>
      <Box sx={{ mt: 1 }}>
        <Box component="div" className="flex flex-wrap gap-4 items-end">
          <LocalizationProvider dateAdapter={AdapterMoment}>
            <DemoContainer components={['TimePicker']}>
              <TimePicker
                value={typeof pref.dayStartTime === 'string' ? moment(pref.dayStartTime, 'HH:mm') : pref.dayStartTime || moment()}
                onChange={(value) => setPref({
                  ...pref,
                  dayStartTime: moment(value).format('HH:mm'),
                })
                }
                label="Day Start"
                slotProps={{
                  textField: {
                    variant: 'filled',
                    size: 'small',
                  },
                }}
              />
            </DemoContainer>
          </LocalizationProvider>
          <LocalizationProvider dateAdapter={AdapterMoment}>
            <DemoContainer components={['TimePicker']}>
              <TimePicker
                value={typeof pref.dayEndTime === 'string' ? moment(pref.dayEndTime, 'HH:mm') : pref.dayEndTime || moment()}
                onChange={(value) =>
                  setPref({
                    ...pref,
                    dayEndTime: moment(value).format('HH:mm'),
                  })
                }
                label="Day End"
                slotProps={{
                  textField: {
                    variant: 'filled',
                    size: 'small',
                  },
                }}
              />
            </DemoContainer>
          </LocalizationProvider>
          <LoadingButton variant="contained" loading={submitLoading} className="!ml-auto" onClick={handleSubmitPref}>
            Save Preference
          </LoadingButton>
          {pref.id &&
            <LoadingButton variant="contained" loading={suggestionLoading} onClick={getSuggestions}>
              Get Schedules
            </LoadingButton>}
        </Box>
        <Box component="div" className="flex flex-wrap gap-4 my-4">
          <Button variant="contained" onClick={() => setOpenTaskDialog(true)}>
            Add Task
          </Button>
          <Button variant="contained" onClick={() => setOpenClassDialog(true)}>
            Add Class
          </Button>
          <Button variant="contained" onClick={() => setOpenJobDialog(true)}>
            Add Job
          </Button>
        </Box>
      </Box>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>Tasks ({pref?.tasks?.length})</AccordionSummary>
        <AccordionDetails>
          {pref?.tasks.map((item, i) => (
            <Box key={i} component='div' className='flex gap-4 justify-between w-full'>
              <Typography>{item.name} | {_.find(DAY_OPS, {value: item.day})?.label} | {moment(item.start).format('h:m a')}</Typography>
              <Button variant="contained" color="error" size="small" onClick={() => deleteTask(i)}>Delete</Button>
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>Classes ({pref?.classes?.length})</AccordionSummary>
        <AccordionDetails>
          {pref?.classes.map((item, i) => (
            <Box key={i} component='div' className='flex gap-4 justify-between w-full'>
              <Typography>{item.name} | {_.find(DAY_OPS, {value: item.day})?.label} | {moment(item.start).format('h:m a')}</Typography>
              <Button variant="contained" color="error" size="small" onClick={() => deleteClass(i)}>Delete</Button>
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>Part Time Job Hours ({pref?.partTimeJobHours?.length})</AccordionSummary>
        <AccordionDetails>
          {pref?.partTimeJobHours.map((item, i) => (
            <Box key={i} component='div' className='flex gap-4 justify-between w-full'>
              <Typography>{item.name} | {_.find(DAY_OPS, {value: item.day})?.label} | {moment(item.start).format('h:m a')}</Typography>
              <Button variant="contained" color="error" size="small" onClick={() => deleteJob(i)}>Delete</Button>
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>
      <Box sx={{ marginTop: 2 }} className="h-full">
        {suggestion && !suggestionLoading ? <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          selectable
          defaultDate={defaultDate}
          views={views}
          defaultView={Views.WEEK}
        /> : suggestionLoading && (<div className="flex justify-center items-center">
          <CircularProgress />
        </div>)
        }
      </Box>
      <Dialog open={openTaskDialog} onClose={() => setOpenTaskDialog(false)}>
        <DialogTitle>Add Task</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmitTask} noValidate>
            <Select name="day" fullWidth defaultValue={0}>
              {DAY_OPS.map(d => (
                <MenuItem value={d.value} key={d.value}>{d.label}</MenuItem>
              ))}
            </Select>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Title"
              name="name"
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Priority"
              name="priority"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Duration"
              name="duration"
            />
            <Button type="submit" variant="contained" fullWidth sx={{ marginTop: 1 }}>
              Save
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setOpenTaskDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openClassDialog} onClose={() => setOpenClassDialog(false)}>
        <DialogTitle>Add Class</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmitClass} noValidate>
            <Select name="day" fullWidth defaultValue={0}>
              {DAY_OPS.map(d => (
                <MenuItem value={d.value} key={d.value}>{d.label}</MenuItem>
              ))}
            </Select>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Title"
              name="name"
              autoFocus
            />
            <Box component="div" className="flex gap-4">
              <LocalizationProvider dateAdapter={AdapterMoment}>
                <DemoContainer components={['TimePicker']}>
                  <TimePicker
                    label="Start time"
                    slotProps={{
                      textField: {
                        variant: 'filled',
                      },
                    }}
                    name="startTime"
                  />
                </DemoContainer>
              </LocalizationProvider>
              <LocalizationProvider dateAdapter={AdapterMoment}>
                <DemoContainer components={['TimePicker']}>
                  <TimePicker
                    label="End time"
                    slotProps={{
                      textField: {
                        variant: 'filled',
                      },
                    }}
                    name="endTime"
                  />
                </DemoContainer>
              </LocalizationProvider>
            </Box>
            <Button type="submit" variant="contained" fullWidth sx={{ marginTop: 1 }}>
              Save
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setOpenClassDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openJobDialog} onClose={() => setOpenJobDialog(false)}>
        <DialogTitle>Add Job</DialogTitle>
        <DialogContent>
        <Box component="form" onSubmit={handleSubmitJob} noValidate>
            <Select name="day" fullWidth defaultValue={0}>
              {DAY_OPS.map(d => (
                <MenuItem value={d.value} key={d.value}>{d.label}</MenuItem>
              ))}
            </Select>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Title"
              name="name"
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Duration"
              name="duration"
            />
            <Button type="submit" variant="contained" fullWidth sx={{ marginTop: 1 }}>
              Save
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setOpenJobDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}