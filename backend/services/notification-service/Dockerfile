FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY ./shared ./shared
COPY ./services/notification-service/src ./services/notification-service/src
WORKDIR /src/services/notification-service/src
RUN dotnet restore && dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "notification-service.dll"]
