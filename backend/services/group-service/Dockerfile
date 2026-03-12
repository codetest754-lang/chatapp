FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY ./shared ./shared
COPY ./services/group-service/src ./services/group-service/src
WORKDIR /src/services/group-service/src
RUN dotnet restore && dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "group-service.dll"]
