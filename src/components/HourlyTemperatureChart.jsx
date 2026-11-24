import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function HourlyTemperatureChart({ hours, unit }) {
  return <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={hours} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
      <defs><linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5ca8ce" stopOpacity={0.23} /><stop offset="100%" stopColor="#5ca8ce" stopOpacity={0.015} /></linearGradient></defs>
      <CartesianGrid stroke="#e9eff3" vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#8495a3', fontSize: 11 }} interval={Math.max(1, Math.floor(hours.length / 6))} />
      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#8495a3', fontSize: 11 }} tickFormatter={(value) => `${value}°`} domain={['dataMin - 2', 'dataMax + 2']} />
      <Tooltip formatter={(value) => [`${value}°${unit}`, 'Temperature']} labelStyle={{ color: '#243b50' }} contentStyle={{ borderRadius: 12, border: '1px solid #e5edf3', boxShadow: '0 8px 24px #23425a18' }} />
      <Area type="monotone" dataKey="shownTemp" stroke="#397fa7" strokeWidth={2.6} fill="url(#tempFill)" dot={false} activeDot={{ r: 5, fill: '#fff', stroke: '#397fa7', strokeWidth: 2 }} connectNulls={false} />
    </AreaChart>
  </ResponsiveContainer>
}
