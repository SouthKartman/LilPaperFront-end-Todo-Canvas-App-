import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  ChevronRight,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map as MapIcon,
  MoreHorizontal,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react";
import React from "react";

// Структура данных (соответствует скриншоту)
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "https://avatars.githubusercontent.com/u/93534577?v=4", // Или любая картинка
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true, // Изначально открыт
      items: [
        { title: "History", url: "#" },
        { title: "Starred", url: "#" },
        { title: "Settings", url: "#" },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        { title: "Genesis", url: "#" },
        { title: "Explorer", url: "#" },
        { title: "Quantum", url: "#" },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "Introduction", url: "#" },
        { title: "Get Started", url: "#" },
        { title: "Tutorials", url: "#" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        { title: "General", url: "#" },
        { title: "Team", url: "#" },
        { title: "Billing", url: "#" },
      ],
    },
  ],
  projects: [
    { name: "Design Engineering", url: "#", icon: Frame },
    { name: "Sales & Marketing", url: "#", icon: PieChart },
    { name: "Travel", url: "#", icon: MapIcon },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeTeam, setActiveTeam] = React.useState(data.teams[0]);
  const ActiveTeamLogo = activeTeam.logo;

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* 1. ШАПКА: Выбор организации (Acme Inc) */}
      <SidebarHeader>
        {/* <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <ActiveTeamLogo className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {activeTeam.name}
                      </span>
                      <span className="truncate text-xs">
                        {activeTeam.plan}
                      </span>
                    </div>
                    <ChevronRight className="ml-auto size-4 rotate-90" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent
                className="w-[var(--sidebar-width)] min-w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Команды
                  </DropdownMenuLabel>
                  {data.teams.map((team) => {
                    const TeamLogo = team.logo;
                    return (
                      <DropdownMenuItem
                        key={team.name}
                        onClick={() => setActiveTeam(team)}
                        className="gap-2 p-2"
                      >
                        <div className="flex size-6 items-center justify-center rounded-sm border">
                          <TeamLogo className="size-4 shrink-0" />
                        </div>
                        {team.name}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu> */}
      </SidebarHeader>

      {/* 2. ОСНОВНОЙ КОНТЕНТ */}
      <SidebarContent>
        {/* Группа: Platform */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {data.navMain.map((item) => {
              const ItemIcon = item.icon;
              return (
                <Collapsible
                  key={item.title}
                  render={<SidebarMenuItem />}
                  defaultOpen={item.isActive}
                  className="group/collapsible"
                >
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton tooltip={item.title}>
                        <ItemIcon />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto size-4 transition-transform duration-200 data-panel-open:rotate-90" />
                      </SidebarMenuButton>
                    }
                  />
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            render={
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                              </a>
                            }
                          />
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Группа: Projects */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarMenu>
            {data.projects.map((item) => {
              const ProjectIcon = item.icon;
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    render={
                      <a href={item.url}>
                        <ProjectIcon />
                        <span>{item.name}</span>
                      </a>
                    }
                  />
                </SidebarMenuItem>
              );
            })}
            {/* Кнопка More */}
            <SidebarMenuItem>
              <SidebarMenuButton className="text-sidebar-foreground/70">
                <MoreHorizontal className="text-sidebar-foreground/70" />
                <span>More</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* 3. ПОДВАЛ: Блок пользователя (shadcn) */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                  >
                    <img
                      src={data.user.avatar}
                      alt={data.user.name}
                      className="size-8 rounded-lg"
                    />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {data.user.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {data.user.email}
                      </span>
                    </div>
                    <ChevronRight className="ml-auto size-4 -rotate-90" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent
                className="w-[var(--sidebar-width)] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <img
                        src={data.user.avatar}
                        alt={data.user.name}
                        className="size-8 rounded-lg"
                      />
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {data.user.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {data.user.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Выйти</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
