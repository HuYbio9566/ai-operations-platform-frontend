import axios from 'axios'

const BASE = '/api'

export const api = {
  feedback: (force = false) => axios.get(`${BASE}/feedback/${force ? '?force=1' : ''}`).then(r => r.data.data),
  knowledge: (force = false) => axios.get(`${BASE}/knowledge/${force ? '?force=1' : ''}`).then(r => r.data.data),
  tuitui: (force = false) => axios.get(`${BASE}/tuitui/${force ? '?force=1' : ''}`).then(r => r.data.data),
  skillhubAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return axios.get(`${BASE}/skillhub/all/${qs ? '?' + qs : ''}`).then(r => r.data.data)
  },
  skillhubTrend: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return axios.get(`${BASE}/skillhub/trend/${qs ? '?' + qs : ''}`).then(r => r.data.data)
  },
  skillhubNameDetail: (type, name, params = {}) => {
    const qs = new URLSearchParams({ type, name, ...params }).toString()
    return axios.get(`${BASE}/skillhub/name-detail/?${qs}`).then(r => r.data.data)
  },
}
