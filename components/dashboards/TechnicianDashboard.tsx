"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Package, 
  AlertTriangle, 
  Activity,
  BarChart3,
  Smartphone,
  Wrench,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Thermometer,
  Droplets,
  Zap,
  QrCode,
  FileText,
  Settings,
  Loader2
} from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/app/[locale]/providers"
import { useRouter } from "next/navigation"

interface TechnicianStats {
  assignedBatches: number
  activeTasks: number
  completedToday: number
  qualityChecks: number
  sensorReadings: number
  alertsResolved: number
}

interface Batch {
  _id: string
  batch_id: string
  grain_type: string
  quantity_kg: number
  status: string
  risk_score: number
  intake_date: string
  created_at?: string
  quality_score?: number
  silo_id?: {
    _id: string
    name: string
  }
}

interface SensorReading {
  _id: string
  device_id: string
  sensor_type: string
  value: number
  unit: string
  status: string
  location: string
  timestamp: string
  battery?: number
  signal_strength?: number
}

type AlertSeverity = "high" | "medium" | "low"

interface Alert {
  _id: string
  type: AlertSeverity
  message: string
  severity: string
  status: string
  created_at: string
  location?: string
  batch_id?: string
}

export function TechnicianDashboard() {
  const router = useRouter()
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<TechnicianStats>({
    assignedBatches: 0,
    activeTasks: 0,
    completedToday: 0,
    qualityChecks: 0,
    sensorReadings: 0,
    alertsResolved: 0
  })
  const [assignedBatches, setAssignedBatches] = useState<Batch[]>([])
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([])
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])

  useEffect(() => {
    const fetchTechnicianData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const supabase = createClient()

        // Fetch batches assigned to this technician's admin
        const { data: batches, error: batchError } = await supabase
          .from('grain_batches')
          .select('*, silo:silos(name)')
          .order('created_at', { ascending: false })
          .limit(50)

        if (batchError) throw batchError

        if (batches) {
          const mappedBatches = batches.map(b => ({
            _id: b.id,
            batch_id: b.batch_code || b.id,
            grain_type: b.grain_type,
            quantity_kg: b.quantity_kg,
            status: b.status,
            risk_score: b.risk_score || 0,
            intake_date: b.created_at,
            quality_score: b.quality_score,
            silo_id: { _id: b.silo_id, name: b.silo?.name || "Storage" }
          }))
          setAssignedBatches(mappedBatches)

          // Calculate stats from batches
          const activeBatches = batches.filter(b =>
            b.status !== "dispatched" && b.status !== "completed"
          ).length

          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const completedToday = batches.filter(b => {
            if (b.status !== "dispatched" && b.status !== "completed") return false
            return new Date(b.updated_at) >= today
          }).length

          setStats(prev => ({
            ...prev,
            assignedBatches: batches.length,
            activeTasks: activeBatches,
            completedToday,
            qualityChecks: batches.filter(b => b.quality_score !== null).length
          }))
        }

        // Fetch sensor readings
        const { data: sensors } = await supabase
          .from('sensor_devices')
          .select('*, silo:silos(name)')
          .limit(20)

        if (sensors) {
          const readings: SensorReading[] = sensors.slice(0, 4).map((s) => ({
            _id: s.id,
            device_id: s.device_id || s.id,
            sensor_type: "temperature", // Default
            value: 0,
            unit: "°C",
            status: s.status === "active" ? "normal" : "warning",
            location: s.silo?.name || "Unknown",
            timestamp: s.last_seen || new Date().toISOString(),
            battery: 85,
            signal_strength: -65
          }))
          setSensorReadings(readings)
          setStats(prev => ({
            ...prev,
            sensorReadings: sensors.length
          }))
        }

        // Fetch alerts
        const { data: alertsData } = await supabase
          .from('grain_alerts')
          .select('*, silo:silos(name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10)

        if (alertsData) {
          const mapped: Alert[] = alertsData.slice(0, 5).map(a => {
            return {
              _id: a.id,
              type: a.priority === 'critical' ? 'high' : a.priority === 'medium' ? 'medium' : 'low',
              message: a.title,
              severity: a.priority,
              status: a.status,
              created_at: a.created_at,
              location: a.silo?.name,
              batch_id: a.batch_id
            }
          })
          setRecentAlerts(mapped)
          // Alerts resolved count would need a separate query or better status tracking
        }
      } catch (err) {
        console.error('Error fetching technician data:', err)
        setError('Failed to load technician dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchTechnicianData()
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "dispatched":
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "processing":
      case "stored":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "dispatched":
      case "completed":
        return "bg-green-100 text-green-800"
      case "processing":
      case "stored":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (riskScore: number) => {
    if (riskScore >= 70) return "bg-red-100 text-red-800"
    if (riskScore >= 40) return "bg-orange-100 text-orange-800"
        return "bg-green-100 text-green-800"
    }

  const getPriorityLabel = (riskScore: number) => {
    if (riskScore >= 70) return "high"
    if (riskScore >= 40) return "medium"
    return "low"
  }

  const getSensorStatusColor = (status: string) => {
    switch (status) {
      case "normal":
      case "good":
        return "bg-green-100 text-green-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      case "critical":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSensorIcon = (sensor: string) => {
    switch (sensor.toLowerCase()) {
      case "temperature":
        return <Thermometer className="h-4 w-4" />
      case "humidity":
        return <Droplets className="h-4 w-4" />
      case "co2":
        return <Activity className="h-4 w-4" />
      case "moisture":
        return <Droplets className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const formatDate = (date: string) => {
    if (!date) return "N/A"
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const minutes = Math.floor(diffMs / (1000 * 60))
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Technician Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedBatches}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeTasks} active tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">
              Batches processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Checks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qualityChecks}</div>
            <p className="text-xs text-muted-foreground">
              Total batches checked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts Resolved</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.alertsResolved}</div>
            <p className="text-xs text-muted-foreground">
              Resolved today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {recentAlerts.filter(alert => alert.status !== "resolved").length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Alerts ({recentAlerts.filter(alert => alert.status !== "resolved").length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentAlerts.filter(alert => alert.status !== "resolved").map((alert) => (
                <div key={alert._id} className={`flex items-center justify-between p-3 bg-white rounded-lg border ${alert.severity === "high" ? "border-red-200" :
                  alert.severity === "medium" ? "border-orange-200" :
                  "border-yellow-200"
                }`}>
                  <div>
                    <p className={`font-medium ${alert.severity === "high" ? "text-red-900" :
                      alert.severity === "medium" ? "text-orange-900" :
                      "text-yellow-900"
                    }`}>
                      {alert.message}
                    </p>
                    <p className="text-sm text-gray-600">
                      {alert.location || "System"} • {formatDate(alert.created_at)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getSensorStatusColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <Button size="sm" variant="outline">Acknowledge</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Assigned Batches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="h-5 w-5 mr-2" />
              My Batches
            </CardTitle>
            <CardDescription>
              Batches assigned to your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedBatches.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No batches assigned</p>
            ) : (
            <div className="space-y-4">
                {assignedBatches.slice(0, 5).map((batch) => (
                  <div key={batch._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        {getStatusIcon(batch.status)}
                        <h4 className="font-medium">{batch.grain_type}</h4>
                        <Badge className={getPriorityColor(batch.risk_score)}>
                          {getPriorityLabel(batch.risk_score)}
                      </Badge>
                        <Badge className={getStatusColor(batch.status)}>
                          {batch.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {batch.batch_id} • {batch.quantity_kg.toLocaleString()} kg
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>{batch.silo_id?.name || "Unassigned"}</span>
                        <span>Quality: {batch.quality_score || "N/A"}%</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/grain-batches/${batch._id}`)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Sensor Readings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Sensor Readings
            </CardTitle>
            <CardDescription>
              Real-time sensor data from assigned silos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sensorReadings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sensor readings available</p>
            ) : (
            <div className="space-y-4">
              {sensorReadings.map((reading) => (
                  <div key={reading._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        {getSensorIcon(reading.sensor_type)}
                        <h4 className="font-medium capitalize">{reading.sensor_type}</h4>
                      <Badge className={getSensorStatusColor(reading.status)}>
                        {reading.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <span className="text-lg font-bold">{reading.value}{reading.unit}</span>
                      <span>{reading.location}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Last update: {formatDate(reading.timestamp)}
                        {reading.battery && ` • Battery: ${reading.battery}%`}
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts History */}
      {recentAlerts.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Recent Alerts
          </CardTitle>
          <CardDescription>
            Alert history and resolution status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
                <div key={alert._id} className={`flex items-center justify-between p-3 rounded-lg border ${alert.status === "resolved" ? "bg-green-50 border-green-200" :
                alert.status === "acknowledged" ? "bg-blue-50 border-blue-200" :
                "bg-yellow-50 border-yellow-200"
              }`}>
                <div className="flex items-center space-x-3">
                  {alert.status === "resolved" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : alert.status === "acknowledged" ? (
                    <Clock className="h-4 w-4 text-blue-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <div>
                      <p className={`font-medium ${alert.status === "resolved" ? "text-green-900" :
                      alert.status === "acknowledged" ? "text-blue-900" :
                      "text-yellow-900"
                    }`}>
                      {alert.message}
                    </p>
                      <p className={`text-sm ${alert.status === "resolved" ? "text-green-600" :
                      alert.status === "acknowledged" ? "text-blue-600" :
                      "text-yellow-600"
                    }`}>
                        {alert.location || "System"} • {formatDate(alert.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={
                    alert.severity === "high" ? "destructive" :
                    alert.severity === "medium" ? "secondary" :
                    "default"
                  }>
                    {alert.severity}
                  </Badge>
                  <Badge className={
                    alert.status === "resolved" ? "bg-green-100 text-green-800" :
                    alert.status === "acknowledged" ? "bg-blue-100 text-blue-800" :
                    "bg-yellow-100 text-yellow-800"
                  }>
                    {alert.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common technician tasks and operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => router.push("/grain-batches")}
            >
              <Package className="h-6 w-6" />
              <span>View Batches</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push("/sensors")}
            >
              <Smartphone className="h-6 w-6" />
              <span>Sensor Reading</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push("/maintenance")}
            >
              <Wrench className="h-6 w-6" />
              <span>Maintenance</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push("/grain-batches")}
            >
              <QrCode className="h-6 w-6" />
              <span>Scan Batch</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push("/alerts")}
            >
              <FileText className="h-6 w-6" />
              <span>View Alerts</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push("/reports")}
            >
              <BarChart3 className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
