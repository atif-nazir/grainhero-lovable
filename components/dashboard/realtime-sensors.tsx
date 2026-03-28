'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface SensorReading {
  id: string
  sensor_name: string
  sensor_type: string
  last_reading_value: number | null
  last_reading_at: string | null
  is_active: boolean
}

interface ChartData {
  timestamp: string
  [key: string]: number | string
}

export function RealtimeSensors({ siloId }: { siloId: string }) {
  const [sensors, setSensors] = useState<SensorReading[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Initial fetch
    const fetchSensors = async () => {
      try {
        setIsLoading(true)
        const { data, error: fetchError } = await supabase
          .from('sensors')
          .select('*')
          .eq('silo_id', siloId)
          .order('last_reading_at', { ascending: false })

        if (fetchError) throw fetchError

        const typedData = data as SensorReading[]
        setSensors(typedData)

        // Initialize chart data with first readings
        const initialData: ChartData = {
          timestamp: new Date().toLocaleTimeString(),
        }

        typedData.forEach((sensor) => {
          if (sensor.last_reading_value !== null) {
            initialData[sensor.sensor_name] = sensor.last_reading_value
          }
        })

        setChartData([initialData])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sensors')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSensors()

    // Subscribe to realtime updates on the sensors table
    const channel = supabase
      .channel('sensors-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensors',
          filter: `silo_id=eq.${siloId}`,
        },
        (payload) => {
          console.log('[v0] Realtime update received:', payload)

          if (payload.eventType === 'UPDATE') {
            const updatedSensor = payload.new as SensorReading

            // Update sensors list
            setSensors((prev) =>
              prev.map((s) =>
                s.id === updatedSensor.id ? updatedSensor : s
              )
            )

            // Add new data point to chart
            if (updatedSensor.last_reading_value !== null) {
              setChartData((prev) => {
                const newData = [...prev]
                const lastEntry = { ...newData[newData.length - 1] }

                // Keep last 60 data points
                if (newData.length >= 60) {
                  newData.shift()
                }

                lastEntry[updatedSensor.sensor_name] = updatedSensor.last_reading_value

                if (prev.length === 0 || 
                    lastEntry.timestamp === newData[newData.length - 1]?.timestamp) {
                  newData[newData.length - 1] = lastEntry
                } else {
                  lastEntry.timestamp = new Date().toLocaleTimeString()
                  newData.push(lastEntry)
                }

                return newData
              })
            }
          } else if (payload.eventType === 'INSERT') {
            const newSensor = payload.new as SensorReading
            setSensors((prev) => [newSensor, ...prev])
          } else if (payload.eventType === 'DELETE') {
            const deletedSensor = payload.old as SensorReading
            setSensors((prev) => prev.filter((s) => s.id !== deletedSensor.id))
          }
        }
      )
      .subscribe((status) => {
        console.log('[v0] Subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [siloId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sensor Readings</CardTitle>
          <CardDescription>Real-time sensor data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading sensors...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Error Loading Sensors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (sensors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sensor Readings</CardTitle>
          <CardDescription>No sensors configured yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No sensors found for this silo
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get active sensors for the chart
  const activeSensors = sensors.filter((s) => s.is_active)

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Sensor Data</CardTitle>
          <CardDescription>
            Live updates from {activeSensors.length} active sensor
            {activeSensors.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
                <Legend />
                {activeSensors.map((sensor, idx) => (
                  <Line
                    key={sensor.id}
                    type="monotone"
                    dataKey={sensor.sensor_name}
                    stroke={`hsl(${(idx * 360) / activeSensors.length}, 70%, 50%)`}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Waiting for sensor data...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sensor Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sensors.map((sensor) => (
          <Card
            key={sensor.id}
            className={sensor.is_active ? '' : 'opacity-50'}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {sensor.sensor_name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {sensor.sensor_type}
                  </CardDescription>
                </div>
                <div
                  className={`h-3 w-3 rounded-full ${
                    sensor.is_active
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {sensor.last_reading_value !== null
                    ? sensor.last_reading_value.toFixed(2)
                    : 'N/A'}
                </div>
                <p className="text-xs text-gray-500">
                  {sensor.last_reading_at
                    ? new Date(sensor.last_reading_at).toLocaleString()
                    : 'No readings yet'}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
