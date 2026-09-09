"use client";

import { useMemo, useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import {
  LuCalendarDays as CalendarDays,
  LuPlus as Plus,
  LuUsers as Users,
  LuX as X,
  LuSettings2 as Settings2,
  LuCircleCheckBig as CheckCircle2,
  LuRotateCcw as RotateCcw,
  LuEyeOff as EyeOff,
  LuGlobe as Globe,
} from "react-icons/lu";
import { Pagination, usePagination } from "@app/ui";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/src/providers/AuthProvider";
import { AlertModal } from "@/src/components/ui/AlertModal";
import { ConfirmModal } from "@/src/components/ui/ConfirmModal";
import { EventTypeSkeleton } from "@/src/components/ui/EventTypeSkeleton";
import {
  EventTypeFormLayout,
  LocationTypesMultiSelect,
  empty_form_recurrence,
  format_event_type_location_labels,
  from_form_recurrence,
  parse_location_types_from_storage,
  serialize_location_types,
  to_form_recurrence,
  total_duration_minutes,
  type event_type_form_state,
  type event_type_location_value,
  type event_type_service_provider_option,
} from "@/src/features/event-types/EventTypeFormLayout";
import { default_booking_options_form_fields } from "@/src/features/event-types/event_type_booking_options";
import { EventTypeActionsMenu } from "@/src/features/event-types/EventTypeActionsMenu";
import { EventTypeEditForm } from "@/src/features/event-types/EventTypeEditForm";
import { EventTypeFilters } from "@/src/features/event-types/EventTypeFilters";
import { EventTypeListMobileCards } from "@/src/features/event-types/EventTypeListMobileCards";
import {
  check_event_type_slug_available,
  normalize_event_type_slug_input,
  parse_short_description_from_settings,
  slugify_event_type_title,
  validate_event_type_slug_input,
} from "@/src/features/event-types/event_type_slug";
import {
  event_type_status_label,
  parse_event_type_status,
} from "@/src/features/event-types/event_type_status";
import {
  workspace_meeting_options_to_location,
  workspace_meeting_options_to_location_types,
} from "@/src/utils/meeting_options";
import {
  ROLE_MANAGER,
  ROLE_SERVICE_PROVIDER,
  ROLE_STAFF,
  ROLE_WORKSPACE_ADMIN,
} from "@/src/constants/roles";
import { resolveMeetingOptionsForServiceProvider } from "@/src/utils/providerSettingsResolution";
import {
  parse_workspace_provider_links,
  type workspace_provider_links_settings,
} from "@/lib/provider_booking_link";
import {
  userActsAsServiceProviderFromMetadata,
  userActsAsServiceProviderFromSupabaseUser,
  userIsWorkspaceAdminWithAdditionalServiceProviderFromSupabaseUser,
} from "@/lib/service_provider_role";
import {
  copy_text_to_clipboard,
  get_public_booking_origin,
  resolve_event_type_public_booking_url,
} from "@/src/utils/public_booking_link";
import { useServiceProviders } from "@/src/hooks/useBookingLookups";
import {
  capitalize_booking_display_label,
  getServiceProviderName,
} from "@/src/utils/booking";
import { useWorkspaceSettings } from "@/src/hooks/useWorkspaceSettings";
import { format_timezone_display_label } from "@/lib/date-timezone";
import { parse_event_type_format } from "@/src/features/event-types/event_type_format";
import {
  ProviderAvatar,
  provider_initials,
} from "@/src/features/departments/DepartmentPanelPrimitives";
import type { event_type_format } from "@/src/types/event_types";
import type { event_type_format_filter_value } from "@/src/features/event-types/EventTypeFilters";
import ScreenGate from "@/src/components/ScreenGate";

interface EventType {
  id: number;
  title: string;
  slug: string;
  duration_minutes: number | null;
  buffer_before: number | null;
  buffer_after: number | null;
  location_type: string | null;
  location_value: any;
  is_public: boolean | null;
  status?: string | null;
  internal_label?: string | null;
  event_type_format?: string | null;
  capacity_per_slot?: number | null;
  availability_mode?: string | null;
  recurrence?: unknown;
  allow_waitlist?: boolean | null;
  waitlist_capacity?: number | null;
  show_seats_remaining?: boolean | null;
  min_booking_notice_minutes?: number | null;
  max_booking_window_days?: number | null;
  allow_reschedule?: boolean | null;
  allow_cancellation?: boolean | null;
  settings: any;
  created_at: string;
  bookings_count?: number | null;
  owner_id?: string | null;
}

const EVENT_TYPES_PAGE_SIZE = 10;

const CARD_GRADIENTS = [
  "from-cyan-500 to-sky-600",
  "from-indigo-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-blue-500 to-indigo-600",
] as const;

type event_type_location = "video" | "phone" | "in_person" | "custom";

type event_settings_state = {
  default_visibility: "private" | "public";
  default_location: event_type_location;
  admin_notice: string;
};

const DEFAULT_EVENT_SETTINGS: event_settings_state = {
  default_visibility: "public",
  default_location: "video",
  admin_notice:
    "These settings will be used as default values while creating new event types.",
};

const USER_META_EVENT_TYPE_SETTINGS_KEY = "event_type_settings";

const ALLOWED_VISIBILITIES = new Set<event_settings_state["default_visibility"]>([
  "private",
  "public",
]);
const ALLOWED_LOCATIONS = new Set<event_type_location>([
  "video",
  "phone",
  "in_person",
  "custom",
]);

function normalize_event_settings(
  raw: unknown
): event_settings_state | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const visibility =
    typeof source.default_visibility === "string" &&
    ALLOWED_VISIBILITIES.has(
      source.default_visibility as event_settings_state["default_visibility"]
    )
      ? (source.default_visibility as event_settings_state["default_visibility"])
      : DEFAULT_EVENT_SETTINGS.default_visibility;
  const location =
    typeof source.default_location === "string" &&
    ALLOWED_LOCATIONS.has(source.default_location as event_type_location)
      ? (source.default_location as event_type_location)
      : DEFAULT_EVENT_SETTINGS.default_location;
  const notice =
    typeof source.admin_notice === "string"
      ? source.admin_notice
      : DEFAULT_EVENT_SETTINGS.admin_notice;
  return {
    default_visibility: visibility,
    default_location: location,
    admin_notice: notice,
  };
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function get_card_gradient(id: number): string {
  return CARD_GRADIENTS[Math.abs(id) % CARD_GRADIENTS.length];
}

function get_location_label(location: string | null): string {
  const types = parse_location_types_from_storage(location);
  if (types.length === 0) return "Not set";
  return format_event_type_location_labels(types);
}

function format_duration_short(totalMinutes: number | null): string {
  if (totalMinutes == null) return "—";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h} hr`;
  return `${h}h ${m}m`;
}

function event_type_format_list_label(format: event_type_format): string {
  if (format === "group_class") return "Group";
  if (format === "recurring") return "Recurring";
  return "One-on-one";
}

function event_type_format_badge_class(format: event_type_format): string {
  if (format === "group_class") return "bg-sky-50 text-sky-700";
  if (format === "recurring") return "bg-emerald-50 text-emerald-700";
  return "bg-indigo-50 text-indigo-700";
}

export default function EventTypes() {
  const { user } = useAuth();
  const {
    general,
    settings: workspace_shell_settings,
    workspaceSlug: cachedWorkspaceSlug,
    loading: workspaceSettingsLoading,
  } = useWorkspaceSettings();
  const user_role =
    typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : "";
  const isStaffUser = user_role === ROLE_STAFF;
  const can_assign_event_type_owner =
    user_role === ROLE_WORKSPACE_ADMIN || user_role === ROLE_MANAGER;
  const [items, setItems] = useState<EventType[]>([]);
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open_menu_id, set_open_menu_id] = useState<number | null>(null);
  const [panel_animated_open, set_panel_animated_open] = useState(false);
  const workspaceSlug = (cachedWorkspaceSlug ?? "").trim();
  const [providerLinks, setProviderLinks] = useState<workspace_provider_links_settings>({});
  const [serviceProviderOwnerIds, setServiceProviderOwnerIds] = useState<Set<string>>(
    () => new Set()
  );
  const [teamDeactivatedServiceProviderIds, setTeamDeactivatedServiceProviderIds] =
    useState<Set<string>>(() => new Set());
  const loadingSlug = workspaceSettingsLoading;
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [format_filter, set_format_filter] =
    useState<event_type_format_filter_value>("all");
  const [visibility_filter, set_visibility_filter] = useState<
    "all" | "private" | "public"
  >("all");
  const [provider_filter, set_provider_filter] = useState("");
  const [status_filter, set_status_filter] = useState<"" | "active" | "draft">("");
  const [selected_ids, set_selected_ids] = useState<Set<number>>(() => new Set());
  const { data: serviceProviders, loading: service_providers_loading } =
    useServiceProviders();
  const [settings_open, set_settings_open] = useState(false);
  const [settings_saved_message, set_settings_saved_message] = useState("");
  const [event_settings, set_event_settings] = useState<event_settings_state>(
    DEFAULT_EVENT_SETTINGS
  );
  // All meeting options enabled during onboarding, mapped to event-type location
  // values; used to pre-select multiple locations when creating a new event type.
  const [default_location_types, set_default_location_types] = useState<
    event_type_location_value[]
  >([]);
  const [settings_loaded, set_settings_loaded] = useState(false);
  const [settings_saving, set_settings_saving] = useState(false);
  const [owner_names_by_id, set_owner_names_by_id] = useState<
    Record<string, string>
  >({});
  const submitInFlightRef = useRef(false);
  const slug_touched_ref = useRef(false);
  const [slug_error, set_slug_error] = useState<string | null>(null);

  const logged_in_user_acts_as_service_provider = useMemo(() => {
    if (!user?.id) return false;
    if (userActsAsServiceProviderFromSupabaseUser(user)) return true;
    return serviceProviders.some((provider) => provider.id === user.id);
  }, [user, serviceProviders]);

  const logged_in_user_display_name = useMemo(() => {
    if (!user?.id) return "";
    const from_roster = capitalize_booking_display_label(
      getServiceProviderName(user.id, serviceProviders)
    );
    if (from_roster !== "N/A") return from_roster;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const name = typeof meta?.name === "string" ? meta.name.trim() : "";
    const full_name =
      typeof meta?.full_name === "string" ? meta.full_name.trim() : "";
    if (full_name) return capitalize_booking_display_label(full_name);
    if (name) return capitalize_booking_display_label(name);
    const email_prefix = user.email?.split("@")[0]?.trim();
    return email_prefix
      ? capitalize_booking_display_label(email_prefix)
      : "Current user";
  }, [user, serviceProviders]);

  const event_type_self_assign_option = useMemo(() => {
    if (logged_in_user_acts_as_service_provider) return null;
    if (!logged_in_user_display_name) return null;
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const avatar_url =
      typeof meta?.avatar_url === "string" && meta.avatar_url.trim() !== ""
        ? meta.avatar_url.trim()
        : serviceProviders.find((provider) => provider.id === user?.id)?.avatar_url?.trim() ||
          null;
    return { label: logged_in_user_display_name, avatar_url };
  }, [
    logged_in_user_acts_as_service_provider,
    logged_in_user_display_name,
    serviceProviders,
    user,
  ]);

  const auto_select_self_as_service_provider =
    userIsWorkspaceAdminWithAdditionalServiceProviderFromSupabaseUser(user) ||
    logged_in_user_acts_as_service_provider;

  const default_service_provider_id_for_new_form =
    auto_select_self_as_service_provider && user?.id ? user.id : "";

  const build_settings_derived_form_fields = useCallback((): Pick<
    event_type_form_state,
    "is_public" | "location_types"
  > => {
    const default_location_for_form =
      default_location_types.length > 0
        ? default_location_types
        : event_settings.default_location === "custom"
          ? []
          : [event_settings.default_location];
    return {
      is_public: event_settings.default_visibility === "public",
      location_types: default_location_for_form,
    };
  }, [
    default_location_types,
    event_settings.default_location,
    event_settings.default_visibility,
  ]);

  const empty_form = useCallback((): event_type_form_state => {
    return {
      title: "",
      slug: "",
      internal_label: "",
      short_description: "",
      event_type_format: "one_on_one",
      capacity_per_slot: "1",
      availability_mode: "provider",
      recurrence: empty_form_recurrence(),
      ...default_booking_options_form_fields(),
      duration_hours: "",
      duration_minutes_part: "",
      buffer_before: "",
      buffer_after: "",
      ...build_settings_derived_form_fields(),
      status: "active",
      service_provider_id: default_service_provider_id_for_new_form,
      service_provider_ids: [],
      department_id: "",
      service_id: "",
    };
  }, [build_settings_derived_form_fields, default_service_provider_id_for_new_form]);

  const apply_settings_defaults_to_create_form = useCallback(() => {
    const derived = build_settings_derived_form_fields();
    setForm((prev) => ({
      ...prev,
      is_public: derived.is_public,
      location_types: derived.location_types,
    }));
  }, [build_settings_derived_form_fields]);

  const [form, setForm] = useState<event_type_form_state>(() => ({
    title: "",
    slug: "",
    internal_label: "",
    short_description: "",
    event_type_format: "one_on_one",
    capacity_per_slot: "1",
    availability_mode: "provider",
    recurrence: empty_form_recurrence(),
    ...default_booking_options_form_fields(),
    duration_hours: "",
    duration_minutes_part: "",
    buffer_before: "",
    buffer_after: "",
    location_types: [],
    is_public: true,
    status: "active",
    service_provider_id: "",
    service_provider_ids: [],
    department_id: "",
    service_id: "",
  }));

  useEffect(() => {
    if (!user) return;
    fetchEventTypes();
  }, [user]);

  useEffect(() => {
    if (!user || workspaceSettingsLoading) return;
    void load_event_settings();
  }, [user, workspaceSettingsLoading, workspace_shell_settings]);

  useEffect(() => {
    if (open_menu_id === null) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest("[data-event-type-actions-menu]")
      ) {
        return;
      }
      set_open_menu_id(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open_menu_id]);

  useEffect(() => {
    if (!showForm || !default_service_provider_id_for_new_form) {
      return;
    }
    setForm((prev) =>
      prev.service_provider_id === ""
        ? { ...prev, service_provider_id: default_service_provider_id_for_new_form }
        : prev
    );
  }, [showForm, default_service_provider_id_for_new_form]);

  useEffect(() => {
    if (!settings_loaded || !showForm || editingId !== null) return;
    apply_settings_defaults_to_create_form();
  }, [
    settings_loaded,
    showForm,
    editingId,
    apply_settings_defaults_to_create_form,
  ]);

  const load_event_settings = async () => {
    try {
      const isServiceProvider =
        user?.user_metadata?.role === ROLE_SERVICE_PROVIDER;

      if (!isServiceProvider) {
        const raw_meta = user?.user_metadata?.[
          USER_META_EVENT_TYPE_SETTINGS_KEY
        ] as Record<string, unknown> | undefined;
        const from_meta = normalize_event_settings(raw_meta);
        if (from_meta) {
          set_event_settings(from_meta);
          const saved_location_types = parse_location_types_from_storage(
            raw_meta?.default_location_types as string | null | undefined
          );
          if (saved_location_types.length > 0) {
            set_default_location_types(saved_location_types);
          }
          return;
        }
      }

      const workspace_settings = (workspace_shell_settings ?? {}) as Record<string, unknown>;
      setProviderLinks(parse_workspace_provider_links(workspace_settings.links));
      const rawMeetingOptions = workspace_settings.meeting_options as
        | Record<string, unknown>
        | undefined;
      const meeting_options = isServiceProvider
        ? resolveMeetingOptionsForServiceProvider(
            rawMeetingOptions,
            user?.id ?? null
          )
        : rawMeetingOptions;
      const location_from_meeting_options =
        workspace_meeting_options_to_location(meeting_options);
      if (location_from_meeting_options) {
        set_event_settings((prev) => ({
          ...prev,
          default_location: location_from_meeting_options,
        }));
      }
      set_default_location_types(
        workspace_meeting_options_to_location_types(meeting_options)
      );
    } catch (err) {
      console.error("Failed to load event type settings:", err);
    } finally {
      set_settings_loaded(true);
    }
  };

  const fetchEventTypes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }
      const response = await fetch("/api/event-types", {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const result = await response.json();
      setItems(result.data || []);
      if (typeof result.total_bookings_count === "number") {
        setTotalBookings(result.total_bookings_count);
      } else {
        setTotalBookings(
          (result.data || []).reduce(
            (sum: number, item: EventType) => sum + (item.bookings_count ?? 0),
            0
          )
        );
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (next: event_type_form_state) => {
    if (!slug_touched_ref.current && next.title !== form.title) {
      next = { ...next, slug: slugify_event_type_title(next.title) };
    }
    setForm(next);
    if (formError) setFormError(null);
    if (slug_error) set_slug_error(null);
  };

  const verify_slug = async (
    accessToken: string,
    slug: string
  ): Promise<string | null> => {
    const parsed = validate_event_type_slug_input(slug);
    if (!parsed.ok) {
      set_slug_error(parsed.message);
      return null;
    }
    const result = await check_event_type_slug_available(accessToken, parsed.value);
    if (!result.available) {
      set_slug_error(result.message ?? "This URL slug is already in use.");
      return null;
    }
    set_slug_error(null);
    return parsed.value;
  };

  const handle_slug_blur = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token || !form.slug.trim()) return;
    await verify_slug(session.access_token, form.slug);
  };

  const handle_validate_slug = async (): Promise<boolean> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      set_slug_error("You are not signed in. Please refresh and try again.");
      return false;
    }
    const normalized = await verify_slug(session.access_token, form.slug);
    return normalized != null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) return;

    const durationMinutes = total_duration_minutes(
      form.duration_hours,
      form.duration_minutes_part
    );
    if (durationMinutes < 1) {
      setFormError(
        "Duration must be at least 1 minute (set hours and/or minutes)."
      );
      return;
    }

    const { data: { session: precheckSession } } = await supabase.auth.getSession();
    if (!precheckSession?.access_token) {
      setFormError("You are not signed in. Please refresh and try again.");
      return;
    }

    const normalized_slug = await verify_slug(precheckSession.access_token, form.slug);
    if (!normalized_slug) return;

    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setFormError("You are not signed in. Please refresh and try again.");
        return;
      }

      const payload = {
        title: form.title,
        slug: normalized_slug,
        short_description: form.short_description.trim() || null,
        internal_label: form.internal_label.trim() || null,
        event_type_format: form.event_type_format,
        capacity_per_slot: form.capacity_per_slot,
        availability_mode: form.availability_mode,
        recurrence: from_form_recurrence(form.recurrence),
        allow_waitlist: form.allow_waitlist,
        waitlist_capacity: form.waitlist_capacity.trim() || null,
        show_seats_remaining: form.show_seats_remaining,
        min_booking_notice_minutes: form.min_booking_notice_minutes,
        max_booking_window_days: form.max_booking_window_days,
        allow_reschedule: form.allow_reschedule,
        allow_cancellation: form.allow_cancellation,
        duration_minutes: durationMinutes,
        buffer_before: form.buffer_before || null,
        buffer_after: form.buffer_after || null,
        location_type: serialize_location_types(form.location_types),
        is_public: form.is_public,
        status: form.status,
        department_id: form.department_id.trim() || null,
        service_id: form.service_id.trim() || null,
        service_provider_ids: form.service_provider_ids,
        ...(can_assign_event_type_owner && {
          owner_id: form.service_provider_id.trim() || null,
        }),
      };

      const response = await fetch("/api/event-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        const message =
          typeof error?.error === "string"
            ? error.error
            : "Could not create event type.";
        if (message.toLowerCase().includes("slug")) {
          set_slug_error(message);
        } else {
          setFormError(message);
        }
        return;
      }

      const result = await response.json();
      setItems((prev) => [result.data, ...prev]);

      setFormError(null);
      closePanelAnimated();
      await fetchEventTypes();
    } catch (err) {
      console.error("Error:", err);
      setFormError("Something went wrong. Please try again.");
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const handleEdit = (item: EventType) => {
    if (isStaffUser) return;
    setShowForm(false);
    setFormError(null);
    setEditingId(item.id);
    set_open_menu_id(null);
  };

  const handleDeleteClick = (id: number) => {
    if (isStaffUser) return;
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setDeleteConfirmId(null);
        setAlertMessage("Not authenticated");
        return;
      }
      const response = await fetch(
        `/api/event-types?id=${deleteConfirmId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (!response.ok) {
        const error = await response.json();
        setDeleteConfirmId(null);
        setAlertMessage(error?.error || "Failed to delete event type");
        return;
      }
      setItems((prev) =>
        prev.filter((item) => item.id !== deleteConfirmId)
      );
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Error:", err);
      setDeleteConfirmId(null);
      setAlertMessage("An error occurred while deleting the event type");
    }
  };

  const closePanelAnimated = (afterClose?: () => void) => {
    set_panel_animated_open(false);
    window.setTimeout(() => {
      slug_touched_ref.current = false;
      set_slug_error(null);
      setForm(empty_form());
      setFormError(null);
      setShowForm(false);
      setEditingId(null);
      afterClose?.();
    }, 300);
  };

  const handlePanelClose = () => {
    closePanelAnimated();
  };

  const handleCancel = () => {
    handlePanelClose();
  };

  const handleNewEvent = () => {
    if (isStaffUser) return;
    setEditingId(null);
    slug_touched_ref.current = false;
    set_slug_error(null);
    setForm(empty_form());
    setFormError(null);
    setShowForm(true);
  };

  const handleEditPanelClose = () => {
    closePanelAnimated(() => {
      void fetchEventTypes();
    });
  };

  const handleDuplicate = async (item: EventType) => {
    if (isStaffUser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setAlertMessage("Not authenticated");
        return;
      }
      const base_slug = slugify_event_type_title(`${item.title} Copy`);
      let candidate = base_slug;
      let suffix = 0;
      const taken_slugs = new Set(
        items.map((row) => row.slug).filter((s): s is string => Boolean(s))
      );
      while (taken_slugs.has(candidate)) {
        suffix += 1;
        candidate = `${base_slug}-${suffix}`;
      }
      const payload = {
        title: `${item.title} Copy`,
        slug: candidate,
        short_description: parse_short_description_from_settings(item.settings) || null,
        internal_label: item.internal_label ?? null,
        event_type_format: item.event_type_format ?? "one_on_one",
        capacity_per_slot: item.capacity_per_slot ?? 1,
        availability_mode: item.availability_mode ?? "provider",
        recurrence: from_form_recurrence(to_form_recurrence(item.recurrence)),
        allow_waitlist: item.allow_waitlist ?? true,
        waitlist_capacity: item.waitlist_capacity ?? null,
        show_seats_remaining: item.show_seats_remaining ?? true,
        min_booking_notice_minutes: item.min_booking_notice_minutes ?? 120,
        max_booking_window_days: item.max_booking_window_days ?? 30,
        allow_reschedule: item.allow_reschedule ?? true,
        allow_cancellation: item.allow_cancellation ?? true,
        duration_minutes: item.duration_minutes,
        buffer_before: item.buffer_before,
        buffer_after: item.buffer_after,
        location_type: item.location_type,
        is_public: item.is_public ?? false,
        status: parse_event_type_status(item.status),
      };
      const response = await fetch("/api/event-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        setAlertMessage(error?.error || "Failed to duplicate event type");
        return;
      }
      const result = await response.json();
      setItems((prev) => [result.data, ...prev]);
    } catch (err) {
      console.error("Error duplicating:", err);
      setAlertMessage("Failed to duplicate event type");
    }
  };

  const handleCopyLink = async (item: EventType): Promise<boolean> => {
    if (!item.slug) {
      setAlertMessage(
        `Unable to copy link. Event type "${item.title}" does not have a slug. Please edit and save the event type to generate a slug.`
      );
      return false;
    }

    const ownerIsServiceProvider = Boolean(
      item.owner_id &&
        (serviceProviderOwnerIds.has(item.owner_id) ||
          (item.owner_id === user?.id &&
            user?.user_metadata?.role === ROLE_SERVICE_PROVIDER))
    );

    const useWorkspaceLinkForOwnEventType =
      userIsWorkspaceAdminWithAdditionalServiceProviderFromSupabaseUser(user) &&
      Boolean(item.owner_id && item.owner_id === user?.id);

    const ownerActsAsServiceProvider =
      ownerIsServiceProvider && !useWorkspaceLinkForOwnEventType;

    const resolved = resolve_event_type_public_booking_url(
      workspaceSlug,
      item.slug,
      item.owner_id,
      providerLinks,
      ownerActsAsServiceProvider
    );

    if (!resolved.ok) {
      setAlertMessage(resolved.error);
      return false;
    }

    try {
      const copied = await copy_text_to_clipboard(resolved.url);
      if (!copied) {
        setAlertMessage("Failed to copy link. Please try again.");
        return false;
      }
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
      return true;
    } catch (err) {
      console.error("Failed to copy link:", err);
      setAlertMessage("Failed to copy link. Please try again.");
      return false;
    }
  };

  const handle_copy_link_from_menu = async (item: EventType) => {
    const copied = await handleCopyLink(item);
    if (copied) {
      window.setTimeout(() => set_open_menu_id(null), 1200);
    }
  };

  const handle_save_settings = async () => {
    if (isStaffUser) return;
    if (settings_saving) return;
    set_settings_saving(true);
    try {
      const current_metadata =
        (user?.user_metadata ?? {}) as Record<string, unknown>;
      const { error } = await supabase.auth.updateUser({
        data: {
          ...current_metadata,
          [USER_META_EVENT_TYPE_SETTINGS_KEY]: {
            default_visibility: event_settings.default_visibility,
            default_location: event_settings.default_location,
            default_location_types: serialize_location_types(
              default_location_types
            ),
            admin_notice: event_settings.admin_notice,
          },
        },
      });
      if (error) {
        set_settings_saved_message(
          error.message || "Failed to save settings. Please try again."
        );
      } else {
        set_settings_saved_message("View settings saved successfully.");
        if (showForm && editingId === null) {
          apply_settings_defaults_to_create_form();
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save settings.";
      set_settings_saved_message(message);
    } finally {
      set_settings_saving(false);
      setTimeout(() => set_settings_saved_message(""), 2500);
    }
  };

  const handle_reset_settings = () => {
    set_event_settings(DEFAULT_EVENT_SETTINGS);
    set_default_location_types([DEFAULT_EVENT_SETTINGS.default_location]);
    set_settings_saved_message("Settings reset to default values.");
    setTimeout(() => set_settings_saved_message(""), 2500);
  };

  const show_owner_labels = useMemo(() => {
    const owner_ids = new Set(
      items
        .map((item) => item.owner_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    );
    return owner_ids.size > 1;
  }, [items]);

  useEffect(() => {
    if (!user) {
      setServiceProviderOwnerIds(new Set());
      setTeamDeactivatedServiceProviderIds(new Set());
      set_owner_names_by_id({});
      return;
    }

    let cancelled = false;

    const load_team_members = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) return;

        const response = await fetch("/api/team-members", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok || cancelled) return;

        const data = await response.json();
        const names: Record<string, string> = {};
        const service_provider_ids = new Set<string>();
        const deactivated_service_provider_ids_from_team = new Set<string>();

        for (const member of (data.teamMembers || []) as Array<{
          id?: string;
          name?: string;
          role?: string | null;
          is_workspace_owner?: boolean;
          additional_roles?: string[] | null;
          deactivated?: boolean;
        }>) {
          if (member.id && member.name && show_owner_labels) {
            names[member.id] = member.name;
          }
          const acts_as_service_provider = Boolean(
            member.id &&
              userActsAsServiceProviderFromMetadata({
                role: member.role,
                is_workspace_owner: member.is_workspace_owner,
                additional_roles: member.additional_roles,
              })
          );
          if (acts_as_service_provider && member.id) {
            service_provider_ids.add(member.id);
            if (Boolean(member.deactivated)) {
              deactivated_service_provider_ids_from_team.add(member.id);
            }
          }
        }

        if (user?.user_metadata?.role === ROLE_SERVICE_PROVIDER && user.id) {
          service_provider_ids.add(user.id);
        }

        if (!cancelled) {
          setServiceProviderOwnerIds(service_provider_ids);
          setTeamDeactivatedServiceProviderIds(
            deactivated_service_provider_ids_from_team
          );
          if (show_owner_labels) {
            set_owner_names_by_id(names);
          } else {
            set_owner_names_by_id({});
          }
        }
      } catch (err) {
        console.error("Error loading team members:", err);
      }
    };

    load_team_members();
    return () => {
      cancelled = true;
    };
  }, [user, show_owner_labels]);

  const deactivated_service_provider_ids = useMemo(() => {
    const ids = new Set<string>();
    for (const provider of serviceProviders) {
      if (provider.deactivated) ids.add(provider.id);
    }
    for (const id of teamDeactivatedServiceProviderIds) {
      ids.add(id);
    }
    return ids;
  }, [serviceProviders, teamDeactivatedServiceProviderIds]);

  const service_provider_filter_label = (providerId: string) => {
    const name = capitalize_booking_display_label(
      getServiceProviderName(providerId, serviceProviders)
    );
    return deactivated_service_provider_ids.has(providerId)
      ? `${name} (Inactive)`
      : name;
  };

  const can_filter_event_types_by_provider =
    user_role === ROLE_WORKSPACE_ADMIN ||
    user_role === ROLE_MANAGER ||
    user_role === ROLE_STAFF;

  const show_service_provider_filter =
    can_filter_event_types_by_provider && serviceProviders.length > 1;

  const sorted_service_providers = useMemo(
    () =>
      [...serviceProviders].sort((a, b) => {
        const aInactive = deactivated_service_provider_ids.has(a.id) ? 1 : 0;
        const bInactive = deactivated_service_provider_ids.has(b.id) ? 1 : 0;
        if (aInactive !== bInactive) return aInactive - bInactive;
        return service_provider_filter_label(a.id).localeCompare(
          service_provider_filter_label(b.id)
        );
      }),
    [serviceProviders, deactivated_service_provider_ids]
  );

  const active_service_providers = useMemo(
    () => serviceProviders.filter((provider) => !provider.deactivated),
    [serviceProviders]
  );

  const event_type_service_provider_options = useMemo((): event_type_service_provider_option[] => {
    const active_options = active_service_providers.map((provider) => ({
      id: provider.id,
      label: capitalize_booking_display_label(
        getServiceProviderName(provider.id, serviceProviders)
      ),
      avatar_url: provider.avatar_url?.trim() || null,
      role_label: "Service provider",
    }));

    const selected_id = form.service_provider_id.trim();
    if (
      !selected_id ||
      active_options.some((option) => option.id === selected_id)
    ) {
      return active_options;
    }

    const selected_provider = serviceProviders.find(
      (provider) => provider.id === selected_id
    );
    if (!selected_provider) return active_options;

    return [
      ...active_options,
      {
        id: selected_provider.id,
        label: `${capitalize_booking_display_label(
          getServiceProviderName(selected_provider.id, serviceProviders)
        )} (Inactive)`,
        avatar_url: selected_provider.avatar_url?.trim() || null,
      },
    ];
  }, [active_service_providers, form.service_provider_id, serviceProviders]);

  const total_event_types = items.filter(
    (e) => parse_event_type_status(e.status) === "active"
  ).length;
  const draft_event_types = items.filter(
    (e) => parse_event_type_status(e.status) === "draft"
  ).length;
  const private_event_types = items.filter((e) => !e.is_public).length;

  const filtered_items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const description = parse_short_description_from_settings(item.settings)
        .trim()
        .toLowerCase();
      const matches_search =
        q === "" ||
        item.title.toLowerCase().includes(q) ||
        (item.slug ?? "").toLowerCase().includes(q) ||
        description.includes(q);
      const is_public = !!item.is_public;
      const matches_visibility =
        visibility_filter === "all" ||
        (visibility_filter === "public" && is_public) ||
        (visibility_filter === "private" && !is_public);
      const matches_provider =
        provider_filter === "" || item.owner_id === provider_filter;
      const item_status = parse_event_type_status(item.status);
      const matches_status =
        status_filter === "" || item_status === status_filter;
      const item_format = parse_event_type_format(item.event_type_format);
      const matches_format =
        format_filter === "all" || item_format === format_filter;
      return (
        matches_search &&
        matches_visibility &&
        matches_provider &&
        matches_status &&
        matches_format
      );
    });
  }, [
    items,
    search,
    visibility_filter,
    provider_filter,
    status_filter,
    format_filter,
  ]);

  const {
    paginatedItems: paginated_items,
    currentPage: event_types_page,
    setCurrentPage: set_event_types_page,
    totalPages: event_types_total_pages,
    totalItems: event_types_total_items,
    handlePageChange: handle_event_types_page_change,
  } = usePagination(filtered_items, EVENT_TYPES_PAGE_SIZE);

  useEffect(() => {
    set_event_types_page(1);
  }, [
    search,
    format_filter,
    visibility_filter,
    provider_filter,
    status_filter,
    set_event_types_page,
  ]);

  useEffect(() => {
    set_selected_ids((prev) => {
      const visible = new Set(paginated_items.map((item) => item.id));
      const next = new Set<number>();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
      }
      return next;
    });
  }, [paginated_items]);

  const page_ids = paginated_items.map((item) => item.id);
  const all_page_selected =
    page_ids.length > 0 && page_ids.every((id) => selected_ids.has(id));
  const some_page_selected =
    page_ids.some((id) => selected_ids.has(id)) && !all_page_selected;

  const toggle_select_all_page = () => {
    set_selected_ids((prev) => {
      const next = new Set(prev);
      if (all_page_selected) {
        for (const id of page_ids) next.delete(id);
      } else {
        for (const id of page_ids) next.add(id);
      }
      return next;
    });
  };

  const toggle_select_row = (id: number) => {
    set_selected_ids((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const get_provider_avatar_url = (ownerId: string | null | undefined) => {
    if (!ownerId) return null;
    return (
      serviceProviders.find((provider) => provider.id === ownerId)?.avatar_url?.trim() ||
      null
    );
  };

  const panel_open = showForm || editingId !== null;
  const panel_visible = panel_open || panel_animated_open;

  useEffect(() => {
    if (!panel_open) {
      set_panel_animated_open(false);
      return;
    }

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => set_panel_animated_open(true));
    });

    return () => cancelAnimationFrame(frame);
  }, [panel_open]);

  const team_based_event_types = items.filter(
    (item) =>
      item.owner_id && serviceProviderOwnerIds.has(item.owner_id)
  ).length;
  const default_timezone_label = format_timezone_display_label(general?.timezone);
  const review_timezone_label = useMemo(() => {
    if (default_timezone_label === "Not set") return default_timezone_label;
    return default_timezone_label.replace(/^[^/]+\//, "").replace(/_/g, " ");
  }, [default_timezone_label]);

  const review_booking_url = useMemo(() => {
    const event_slug = normalize_event_type_slug_input(form.slug);
    if (!workspaceSlug || !event_slug) return null;

    const owner_id = form.service_provider_id.trim() || null;
    const owner_is_service_provider = Boolean(
      owner_id &&
        (serviceProviderOwnerIds.has(owner_id) ||
          (owner_id === user?.id &&
            user?.user_metadata?.role === ROLE_SERVICE_PROVIDER))
    );
    const use_workspace_link_for_own =
      userIsWorkspaceAdminWithAdditionalServiceProviderFromSupabaseUser(user) &&
      Boolean(owner_id && owner_id === user?.id);
    const owner_acts_as_service_provider =
      owner_is_service_provider && !use_workspace_link_for_own;

    const resolved = resolve_event_type_public_booking_url(
      workspaceSlug,
      event_slug,
      owner_id,
      providerLinks,
      owner_acts_as_service_provider
    );
    if (resolved.ok) return resolved.url;
    return `${get_public_booking_origin()}/${workspaceSlug}/${event_slug}`;
  }, [
    form.service_provider_id,
    form.slug,
    providerLinks,
    serviceProviderOwnerIds,
    user,
    workspaceSlug,
  ]);

  const get_provider_label = (ownerId: string | null | undefined) => {
    if (!ownerId) return "—";
    if (show_owner_labels && owner_names_by_id[ownerId]) {
      return owner_names_by_id[ownerId];
    }
    const name = capitalize_booking_display_label(
      getServiceProviderName(ownerId, serviceProviders)
    );
    return name === "N/A" ? "—" : name;
  };

  return (
    <>
      <section
        className={cn(
          "space-y-6",
          panel_animated_open && "hidden md:block"
        )}
      >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Event Types
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create and manage booking event types for your team.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => set_settings_open(true)}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                View Settings
              </button>
              {!isStaffUser ? (
                <button
                  type="button"
                  onClick={handleNewEvent}
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event Type
                </button>
              ) : null}
            </div>
          </div>

          <ScreenGate minWidth={768}>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-4 md:gap-4 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
              <div className="md:flex md:items-center md:gap-3">
                <div className="flex items-center gap-2 md:contents">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 md:h-10 md:w-10">
                    <CalendarDays className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 md:hidden">{total_event_types}</p>
                </div>
                <div className="mt-1 min-w-0 md:mt-0">
                  <p className="hidden text-2xl font-bold text-slate-900 md:block">{total_event_types}</p>
                  <p className="text-[11px] font-medium leading-snug text-slate-500 md:text-xs">
                    Active event types
                  </p>
                </div>
              </div>
            </div>

            {/* <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{team_based_event_types}</p>
                  <p className="text-xs font-medium text-slate-500">Team-based</p>
                </div>
              </div>
            </div> */}

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
              <div className="md:flex md:items-center md:gap-3">
                <div className="flex items-center gap-2 md:contents">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 md:h-10 md:w-10">
                    <EyeOff className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 md:hidden">{draft_event_types}</p>
                </div>
                <div className="mt-1 min-w-0 md:mt-0">
                  <p className="hidden text-2xl font-bold text-slate-900 md:block">{draft_event_types}</p>
                  <p className="text-[11px] font-medium leading-snug text-slate-500 md:text-xs">
                    Draft
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
              <div className="md:flex md:items-center md:gap-3">
                <div className="flex items-center gap-2 md:contents">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 md:h-10 md:w-10">
                    <EyeOff className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 md:hidden">{private_event_types}</p>
                </div>
                <div className="mt-1 min-w-0 md:mt-0">
                  <p className="hidden text-2xl font-bold text-slate-900 md:block">{private_event_types}</p>
                  <p className="text-[11px] font-medium leading-snug text-slate-500 md:text-xs">
                    Private
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-1 xl:col-span-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-slate-900">{default_timezone_label}</p>
                  <p className="text-xs font-medium text-slate-500">Default timezone</p>
                </div>
              </div>
            </div>
          </div>
          </ScreenGate>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-visible">
          
            <div className="border-b border-slate-200 p-4 sm:px-5">
              <EventTypeFilters
                search={search}
                format_filter={format_filter}
                visibility_filter={visibility_filter}
                status_filter={status_filter}
                provider_filter={provider_filter}
                show_service_provider_filter={show_service_provider_filter}
                service_provider_options={sorted_service_providers.map((sp) => ({
                  id: sp.id,
                  label: service_provider_filter_label(sp.id),
                }))}
                service_provider_filter_label={service_provider_filter_label}
                result_count={filtered_items.length}
                on_search_change={setSearch}
                on_format_filter_change={set_format_filter}
                on_visibility_filter_change={set_visibility_filter}
                on_status_filter_change={set_status_filter}
                on_provider_filter_change={set_provider_filter}
              />
            </div>

            {loading ? (
              <div className="p-4">
                <EventTypeSkeleton variant="table" />
              </div>
            ) : filtered_items.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <CalendarDays className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {items.length > 0 ? "No event types found" : "No event types yet"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {items.length > 0
                    ? "Try changing your search or filter."
                    : "Create your first event type to get started."}
                </p>
              </div>
            ) : (
              <>
                <ScreenGate maxWidth={1023}>
                  <EventTypeListMobileCards
                    items={paginated_items}
                    format_duration_label={format_duration_short}
                    get_status={parse_event_type_status}
                    get_status_label={event_type_status_label}
                    on_row_click={(item) => {
                      if (isStaffUser) return;
                      handleEdit(item as EventType);
                    }}
                  />
                </ScreenGate>

                <ScreenGate minWidth={1024}>
                <div className="overflow-x-auto max-[1301px]:p-3">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="border-b border-slate-200 px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={all_page_selected}
                            ref={(el) => {
                              if (el) el.indeterminate = some_page_selected;
                            }}
                            onChange={toggle_select_all_page}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            aria-label="Select all event types on this page"
                          />
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Event Type
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Format
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Duration
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Capacity
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Team / Provider
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>
                        {!isStaffUser ? (
                          <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Action
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated_items.map((item) => {
                        const status = parse_event_type_status(item.status);
                        const status_label = event_type_status_label(status);
                        const format = parse_event_type_format(item.event_type_format);
                        const short_description =
                          parse_short_description_from_settings(item.settings);
                        const provider_label = get_provider_label(item.owner_id);
                        const provider_avatar = get_provider_avatar_url(item.owner_id);
                        const capacity =
                          typeof item.capacity_per_slot === "number" &&
                          Number.isFinite(item.capacity_per_slot)
                            ? item.capacity_per_slot
                            : format === "group_class"
                              ? 10
                              : 1;
                        const selected = selected_ids.has(item.id);
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 transition hover:bg-slate-50/80"
                          >
                            <td className="text-sm px-4 py-4 border-b border-slate-100" data-label="Select">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggle_select_row(item.id)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                aria-label={`Select ${item.title}`}
                              />
                            </td>
                            <td className="text-sm px-4 py-4 border-b border-slate-100" data-label="Event Type">
                              <div className="flex items-center max-[1301px]:justify-end gap-3">
                                <div
                                  className={cn(
                                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                                    get_card_gradient(item.id)
                                  )}
                                >
                                  <CalendarDays className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900">
                                    {item.title}
                                  </p>
                                  {short_description ? (
                                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                      {short_description}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="text-sm px-4 py-4 border-b border-slate-100" data-label="Format">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                  event_type_format_badge_class(format)
                                )}
                              >
                                {event_type_format_list_label(format)}
                              </span>
                            </td>
                            <td className="text-sm px-4 py-4 border-b border-slate-100" data-label="Duration">
                              {format_duration_short(item.duration_minutes)}
                            </td>
                            <td className="text-sm px-4 py-4 border-b border-slate-100" data-label="Capacity">
                              {capacity}
                            </td>
                            <td className="text-sm px-4 py-4 border-b border-slate-100" data-label="Team / Provider">
                              <div className="flex items-center max-[1301px]:justify-end gap-2 text-sm text-slate-700">
                                <ProviderAvatar
                                  name={provider_label === "—" ? "Provider" : provider_label}
                                  initials={provider_initials(
                                    provider_label === "—" ? "?" : provider_label
                                  )}
                                  avatarUrl={provider_avatar}
                                  size="sm"
                                />
                                <span className="truncate">{provider_label}</span>
                              </div>
                            </td>
                            <td className="text-sm px-4 py-4 border-b border-slate-100" data-label="Status">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                  status === "active"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                )}
                              >
                                {status_label}
                              </span>
                            </td>
                            {!isStaffUser ? (
                              <td className="text-sm px-4 py-4 border-b border-slate-100" data-label="Action">
                                <div className="flex items-center justify-end">
                                  <EventTypeActionsMenu
                                    open={open_menu_id === item.id}
                                    copy_disabled={loadingSlug || !item.slug}
                                    copy_copied={copiedId === item.id}
                                    on_toggle={() =>
                                      set_open_menu_id((prev) =>
                                        prev === item.id ? null : item.id
                                      )
                                    }
                                    on_copy_link={() => {
                                      void handle_copy_link_from_menu(item);
                                    }}
                                    on_duplicate={() => {
                                      void handleDuplicate(item);
                                      set_open_menu_id(null);
                                    }}
                                    on_delete={() => {
                                      handleDeleteClick(item.id);
                                      set_open_menu_id(null);
                                    }}
                                    on_edit={() => {
                                      handleEdit(item);
                                      set_open_menu_id(null);
                                    }}
                                  />
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </ScreenGate>

                <div className="border-t border-slate-200 px-4 py-3">
                  <Pagination
                    currentPage={event_types_page}
                    totalPages={event_types_total_pages}
                    totalItems={event_types_total_items}
                    itemsPerPage={EVENT_TYPES_PAGE_SIZE}
                    onPageChange={handle_event_types_page_change}
                    loading={loading || submitting}
                    itemLabel="event types"
                  />
                </div>
              </>
            )}
          </div>
        </section>

      <button
        type="button"
        aria-label="Close panel"
        onClick={handlePanelClose}
        className={cn(
          "fixed top-16 left-0 bottom-0 z-30 hidden w-[50vw] bg-black/50 transition-opacity duration-300 ease-in-out md:block",
          panel_animated_open
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        )}
        tabIndex={panel_animated_open ? 0 : -1}
        aria-hidden={!panel_animated_open}
      />

      <aside
        className={cn(
          "asd fixed top-16 right-0 bottom-0 z-40 flex flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl",
          "w-full max-md:w-full lg:!w-[60vw]",
          "transform transition-transform duration-300 ease-in-out will-change-transform",
          panel_animated_open
            ? "translate-x-0"
            : "pointer-events-none translate-x-full"
        )}
        aria-hidden={!panel_visible}
      >
        {panel_visible && (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? "Edit Event Type" : "Add Event Type"}
                </h2>
                <button
                  type="button"
                  onClick={handlePanelClose}
                  className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex min-h-0 h-full flex-1 flex-col overflow-x-scroll pb-[60px] lg:pb-0">
                {editingId !== null ? (
                  <EventTypeEditForm
                    key={editingId}
                    eventTypeId={editingId}
                    embedded
                    variant="panel"
                    onClose={handleEditPanelClose}
                  />
                ) : (
                  <EventTypeFormLayout
                    value={form}
                    onChange={handleFormChange}
                    editingId={null}
                    formError={formError}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    show_service_provider_field={can_assign_event_type_owner}
                    service_provider_options={event_type_service_provider_options}
                    service_providers_loading={service_providers_loading}
                    self_assign_option={event_type_self_assign_option}
                    variant="panel"
                    slug_error={slug_error}
                    on_slug_blur={() => void handle_slug_blur()}
                    on_slug_edited={() => {
                      slug_touched_ref.current = true;
                    }}
                    on_validate_slug={handle_validate_slug}
                    timezone_label={review_timezone_label}
                    booking_url={review_booking_url}
                  />
                )}
              </div>
            </>
          )}
      </aside>

      {deleteConfirmId && (
        <ConfirmModal
          title="Delete Event Type"
          message="Are you sure you want to delete this event type? This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      {alertMessage && (
        <AlertModal
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}

      {settings_open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => set_settings_open(false)}
            className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-[2px]"
          />
          <div className="relative ml-auto flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    View Settings
                  </h2>
                  <p className="text-sm text-slate-500">
                    Manage default event type display and booking preferences.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => set_settings_open(false)}
                className="cursor-pointer rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
              {settings_saved_message && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{settings_saved_message}</span>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Default Setup
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  These values will be used when you create new event types.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Default Visibility
                    </label>
                    <select
                      value={event_settings.default_visibility}
                      onChange={(e) =>
                        set_event_settings((prev) => ({
                          ...prev,
                          default_visibility: e.target.value as
                            | "private"
                            | "public",
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-400"
                    >
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Default Location
                    </label>
                    <LocationTypesMultiSelect
                      value={default_location_types}
                      onChange={set_default_location_types}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <label className="mb-2 block text-sm font-bold text-slate-900">
                  Admin Notice
                </label>
                <textarea
                  rows={5}
                  value={event_settings.admin_notice}
                  onChange={(e) =>
                    set_event_settings((prev) => ({
                      ...prev,
                      admin_notice: e.target.value,
                    }))
                  }
                  placeholder="Add an internal note for workspace admins..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
                />
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Current Summary
                </h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">
                      Default visibility:
                    </span>{" "}
                    {event_settings.default_visibility}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      Default location:
                    </span>{" "}
                    {default_location_types.length > 0
                      ? format_event_type_location_labels(default_location_types)
                      : get_location_label(event_settings.default_location)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                {!isStaffUser ? (
                  <button
                    type="button"
                    onClick={handle_reset_settings}
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </button>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => set_settings_open(false)}
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  {!isStaffUser ? (
                    <button
                      type="button"
                      onClick={handle_save_settings}
                      disabled={settings_saving}
                      className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-100 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {settings_saving ? "Saving…" : "Save Settings"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
